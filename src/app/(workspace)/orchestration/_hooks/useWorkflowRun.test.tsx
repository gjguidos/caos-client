/**
 * Integration tests for useWorkflowRun — Phase 6: reattach / resilience.
 *
 * These tests mirror the pattern in useAgentChat.test.tsx: they rely on the
 * MSW WebSocket interceptor (`chatWebSocket`) to simulate a real connection,
 * then assert on observable Redux state changes.
 *
 * Coverage:
 *  - Persisted runId → `startPending` dispatched on first connect (reattach)
 *  - No reattach when localStorage is empty
 *  - No reattach when Redux already has an active runId
 *  - Snapshot response after reattach → state reconciled
 *  - RunId persisted to localStorage when first assigned from a snapshot
 *  - RunId cleared from localStorage when run reaches a terminal status
 */

import * as wsTokenFetcher from "@/shared/websocket/wsTokenFetcher";
import workflowRunReducer from "@/store/slices/workflowRun/workflowRunSlice";
import {
  closeAllConnections,
  simulateServerMessage,
  waitForConnection,
} from "@/test-utils/test-utils";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runIdStore } from "../_lib/runIdStorage";
import { useWorkflowRun } from "./useWorkflowRun";

vi.mock("@/shared/websocket/wsTokenFetcher");
vi.mock("@/shared/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ---- constants ----------------------------------------------------------------

const AGENT_SYSTEM_NAME = "test-agent-system";
const AGENT_ID = "agent-reattach-123";
const AGENT_NAME = "test-agent";
const USER_ID = "user-456";
const WS_TOKEN = "test-ws-token";
const PERSISTED_RUN_ID = "run-persisted-abc";
const WORKFLOW_KEY = "test_workflow_v1";

// ---- helpers ------------------------------------------------------------------

function makeStore() {
  return configureStore({ reducer: { workflowRun: workflowRunReducer } });
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

function defaultOptions() {
  return {
    agentSystemName: AGENT_SYSTEM_NAME,
    agentId: AGENT_ID,
    agentName: AGENT_NAME,
    userId: USER_ID,
    workflowKey: WORKFLOW_KEY,
  };
}

/** A canonical workflow.run snapshot understood by `parseRunSnapshot`. */
function makeSnapshot(
  runId: string,
  status: string,
  stepIds: string[] = ["step-a"]
) {
  return {
    kind: "workflow.run",
    run_id: runId,
    workflow_name: "Test workflow",
    status,
    paused: null,
    steps: Object.fromEntries(stepIds.map((id) => [id, { status: "PENDING" }])),
    outputs: {},
  };
}

// ---- setup / teardown ---------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockResolvedValue(WS_TOKEN);
  closeAllConnections();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---- tests --------------------------------------------------------------------

describe("useWorkflowRun — reattach on mount", () => {
  it("dispatches startPending with persisted runId on first connect", async () => {
    runIdStore(AGENT_ID, WORKFLOW_KEY).save(PERSISTED_RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();

    await waitFor(() => {
      const state = store.getState().workflowRun;
      expect(state.runId).toBe(PERSISTED_RUN_ID);
      expect(state.isStarting).toBe(true);
    });
  });

  it("does NOT reattach when localStorage has no entry for the agent", async () => {
    // No saveRunId call — localStorage is empty.
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();

    // Give effects time to run.
    await new Promise((r) => setTimeout(r, 50));

    const state = store.getState().workflowRun;
    expect(state.runId).toBeNull();
    expect(state.isStarting).toBe(false);
  });

  it("does NOT reattach when localStorage entry belongs to a different agent", async () => {
    // Entry exists but is keyed to a different agent id.
    runIdStore("other-agent-999", WORKFLOW_KEY).save(PERSISTED_RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();
    await new Promise((r) => setTimeout(r, 50));

    const state = store.getState().workflowRun;
    expect(state.runId).toBeNull();
    expect(state.isStarting).toBe(false);
  });

  it("does NOT reattach a run belonging to another of the agent's workflows", async () => {
    runIdStore(AGENT_ID, "some_other_workflow").save(PERSISTED_RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();
    await new Promise((r) => setTimeout(r, 50));

    const state = store.getState().workflowRun;
    expect(state.runId).toBeNull();
    expect(state.isStarting).toBe(false);
  });

  it("reconciles state when a snapshot arrives after reattach", async () => {
    runIdStore(AGENT_ID, WORKFLOW_KEY).save(PERSISTED_RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();

    // Wait for startPending to be dispatched.
    await waitFor(() =>
      expect(store.getState().workflowRun.isStarting).toBe(true)
    );

    // Server responds with an authoritative snapshot.
    simulateServerMessage(
      makeSnapshot(PERSISTED_RUN_ID, "RUNNING", ["step-a", "step-b"])
    );

    await waitFor(() => {
      const state = store.getState().workflowRun;
      expect(state.runStatus).toBe("RUNNING");
      expect(state.runId).toBe(PERSISTED_RUN_ID);
      expect(state.isStarting).toBe(false);
      expect(state.nodeStatus["step-a"]).toBe("PENDING");
      expect(state.nodeStatus["step-b"]).toBe("PENDING");
    });
  });
});

describe("useWorkflowRun — NOT_FOUND reattach", () => {
  it("discards the run and clears the persisted id on a NOT_FOUND reply", async () => {
    runIdStore(AGENT_ID, WORKFLOW_KEY).save(PERSISTED_RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();

    // Reattach fires: startPending sets the run id we're tracking.
    await waitFor(() => {
      const state = store.getState().workflowRun;
      expect(state.runId).toBe(PERSISTED_RUN_ID);
      expect(state.isStarting).toBe(true);
    });

    // Backend no longer holds the run (expired TTL).
    simulateServerMessage({
      kind: "workflow.run",
      status: "NOT_FOUND",
      run_id: PERSISTED_RUN_ID,
      workflow_key: null,
      workflow_name: null,
      paused: null,
      error: `Run not found: ${PERSISTED_RUN_ID}`,
      steps: {},
      outputs: {},
    });

    await waitFor(() => {
      const state = store.getState().workflowRun;
      expect(state.runId).toBeNull();
      expect(state.runStatus).toBeNull();
      expect(state.isStarting).toBe(false);
    });

    expect(runIdStore(AGENT_ID, WORKFLOW_KEY).load()).toBeNull();
  });

  it("ignores a NOT_FOUND for a run we are not tracking", async () => {
    runIdStore(AGENT_ID, WORKFLOW_KEY).save(PERSISTED_RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();
    await waitFor(() =>
      expect(store.getState().workflowRun.runId).toBe(PERSISTED_RUN_ID)
    );

    // A stale NOT_FOUND for a different (old) run id must not wipe our run.
    simulateServerMessage({
      kind: "workflow.run",
      status: "NOT_FOUND",
      run_id: "some-other-run",
      steps: {},
      outputs: {},
    });

    await new Promise((r) => setTimeout(r, 50));

    const state = store.getState().workflowRun;
    expect(state.runId).toBe(PERSISTED_RUN_ID);
    expect(runIdStore(AGENT_ID, WORKFLOW_KEY).load()).toBe(PERSISTED_RUN_ID);
  });
});

describe("useWorkflowRun — runId persistence", () => {
  it("persists runId to localStorage when received from a snapshot", async () => {
    const NEW_RUN_ID = "run-brand-new-xyz";
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();

    simulateServerMessage(makeSnapshot(NEW_RUN_ID, "RUNNING"));

    await waitFor(() =>
      expect(store.getState().workflowRun.runId).toBe(NEW_RUN_ID)
    );

    expect(runIdStore(AGENT_ID, WORKFLOW_KEY).load()).toBe(NEW_RUN_ID);
  });

  it("clears runId from localStorage when run completes", async () => {
    const RUN_ID = "run-finishing-456";
    runIdStore(AGENT_ID, WORKFLOW_KEY).save(RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();

    // Reattach fires first.
    await waitFor(() =>
      expect(store.getState().workflowRun.isStarting).toBe(true)
    );

    // Server says the run already finished.
    simulateServerMessage(makeSnapshot(RUN_ID, "COMPLETED"));

    await waitFor(() =>
      expect(store.getState().workflowRun.runStatus).toBe("COMPLETED")
    );

    expect(runIdStore(AGENT_ID, WORKFLOW_KEY).load()).toBeNull();
  });

  it("clears runId from localStorage when run fails", async () => {
    const RUN_ID = "run-failing-789";
    runIdStore(AGENT_ID, WORKFLOW_KEY).save(RUN_ID);
    const store = makeStore();

    renderHook(() => useWorkflowRun(defaultOptions()), {
      wrapper: makeWrapper(store),
    });

    await waitForConnection();
    await waitFor(() =>
      expect(store.getState().workflowRun.isStarting).toBe(true)
    );

    simulateServerMessage({
      kind: "workflow.run",
      run_id: RUN_ID,
      workflow_name: "Test workflow",
      status: "FAILED",
      paused: null,
      steps: { "step-a": { status: "FAILED" } },
      outputs: {},
      error: "oops",
    });

    await waitFor(() =>
      expect(store.getState().workflowRun.runStatus).toBe("FAILED")
    );

    expect(runIdStore(AGENT_ID, WORKFLOW_KEY).load()).toBeNull();
  });
});
