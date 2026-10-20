"use client";

import { useAgentWebSocket } from "@/app/(workspace)/chat/_hooks/useAgentWebSocket";
import type {
  ConnectionState,
  ParsedWSMessage,
} from "@/app/(workspace)/chat/websocket.types";
import type { WorkflowActionPayload } from "@/shared/lib/workflow/workflow.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  appendEvent,
  applyStepEvent,
  cancelled,
  reconcileFromSnapshot,
  reset,
  selectWorkflowRun,
  setRunInputs,
  startPending,
} from "@/store/slices/workflowRun/workflowRunSlice";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  parseRunNotFound,
  parseRunSnapshot,
  parseWorkflowStepEvent,
} from "@/shared/lib/workflow/parseRunEvent";
import { runIdStore } from "../_lib/runIdStorage";
import type {
  RunEvent,
  RunStatus,
  StepStatus,
  StepTiming,
  WorkflowPauseInfo,
} from "@/shared/lib/workflow/workflow.types";
import {
  encodeCancel,
  encodeGet,
  encodeResume,
  encodeStart,
} from "@/shared/lib/workflow/workflowCommand";

export interface UseWorkflowRunOptions {
  agentSystemName: string;
  agentId: string;
  agentName: string;
  userId: string;
  workflowKey?: string | null;
  enabled?: boolean;
}

export interface UseWorkflowRunReturn {
  runId: string | null;
  runStatus: RunStatus | null;
  nodeStatus: Record<string, StepStatus>;
  /** Per-step output keyed by step id. */
  stepOutputs: Record<string, unknown>;
  /** Per-step error keyed by step id. */
  stepErrors: Record<string, string>;
  /** Chronological run event log, oldest first. */
  events: RunEvent[];
  /** Inputs the current run was started with, or null before a run. */
  runInputs: Record<string, unknown> | null;
  /** Per-step timings from the backend, keyed by step id. */
  stepTimings: Record<string, StepTiming>;
  /** Step ids in the order they first produced an output or error. */
  outputOrder: string[];
  activePause: WorkflowPauseInfo | null;
  error: string | null;
  isStarting: boolean;
  isConnected: boolean;
  /** Raw WS connection state for surfacing reconnect/error feedback. */
  connectionState: ConnectionState;
  canRun: boolean;
  /** Start a new run with the given declared inputs. */
  start: (inputs: Record<string, unknown>) => void;
  /** Resume a paused run (continue / cancel + payload). */
  resume: (
    payload: Omit<WorkflowActionPayload, "runId" | "workflowKey">
  ) => void;
  /** Cancel the active run. */
  cancel: () => void;
  /** Re-sync from an authoritative snapshot for an existing run. */
  refresh: (runId: string) => void;
  /** Clear all run state. */
  resetRun: () => void;
}

/**
 * Wires the workflow run lifecycle to the shared agent WebSocket transport.
 * Live `workflow.step` events feed `applyStepEvent`; start/resume/get response
 * snapshots feed `reconcileFromSnapshot` (authoritative). Commands are sent via
 * the same `*.comm` envelope the chat client uses.
 */
export function useWorkflowRun(
  options: UseWorkflowRunOptions
): UseWorkflowRunReturn {
  const {
    agentSystemName,
    agentId,
    agentName,
    userId,
    workflowKey,
    enabled = true,
  } = options;

  const dispatch = useAppDispatch();
  const run = useAppSelector(selectWorkflowRun);

  // Run-id persistence bound to this agent + workflow. Inert while no workflow
  // is selected, which is also when `canRun` is false and no run can exist.
  const runs = useMemo(
    () => runIdStore(agentId, workflowKey),
    [agentId, workflowKey]
  );

  // Guard: only attempt reattach once per agent session (reset on agentId change).
  const hasSentReattachRef = useRef(false);

  // Mirror the active run id so `handleMessage` can guard NOT_FOUND handling
  // against the current run without taking `run.runId` as a callback dep.
  const runIdRef = useRef(run.runId);
  runIdRef.current = run.runId;

  // Mirrored so `handleLog` can attribute a log line to the running step
  // without re-subscribing the socket on every status tick.
  const nodeStatusRef = useRef(run.nodeStatus);
  nodeStatusRef.current = run.nodeStatus;

  // The backend has no per-step event feed; its plain-text log frames are the
  // only narration available. Attribute a line to the running step when exactly
  // one step is running — with more (parallel) or none, the line is run-scoped.
  const handleLog = useCallback(
    (message: string) => {
      const text = message?.trim();
      if (!text) return;
      const running = Object.keys(nodeStatusRef.current).filter(
        (stepId) => nodeStatusRef.current[stepId] === "RUNNING"
      );
      dispatch(
        appendEvent({
          kind: "log",
          message: text,
          ...(runIdRef.current ? { runId: runIdRef.current } : {}),
          ...(running.length === 1
            ? { stepId: running[0], inferredStep: true }
            : {}),
        })
      );
    },
    [dispatch]
  );

  const handleMessage = useCallback(
    (parsed: ParsedWSMessage) => {
      // The canonical workflow.run snapshot / workflow.step event arrives nested
      // inside the `.comm` response envelope; the parsers locate it from the raw
      // frame.
      // Step events are incremental; try them first so a step whose status is
      // also a valid run status (e.g. COMPLETED) isn't misread as a snapshot.
      const stepEvent = parseWorkflowStepEvent(parsed.raw);
      if (stepEvent) {
        dispatch(applyStepEvent(stepEvent));
        return;
      }
      const snapshot = parseRunSnapshot(parsed.raw);
      if (snapshot) {
        dispatch(reconcileFromSnapshot(snapshot));
        return;
      }
      // A `get` for a run the backend no longer holds comes back as a
      // NOT_FOUND snapshot. Discard the dead run — clear its persisted id and
      // reset to a clean start screen — but only when it refers to the run we
      // are actually tracking, so a late NOT_FOUND for a stale id can't wipe a
      // freshly started run.
      const notFound = parseRunNotFound(parsed.raw);
      if (notFound && notFound.runId && notFound.runId === runIdRef.current) {
        runs.clear();
        dispatch(reset());
      }
    },
    [dispatch, runs]
  );

  const ws = useAgentWebSocket({
    agentSystemName,
    agentName,
    enabled: enabled && !!agentName,
    onMessage: handleMessage,
    onLog: handleLog,
  });

  // A run always belongs to a workflow, so "no workflow selected" is simply
  // "cannot run" rather than a condition re-checked at every persistence site.
  // Carrying the key rather than a boolean means every command site gets it
  // already narrowed to a string.
  const activeKey =
    ws.isConnected && agentName && userId ? (workflowKey ?? null) : null;
  const canRun = activeKey !== null;

  const send = useCallback(
    (message: string) => {
      ws.send({
        event: `${agentSystemName || ""}.comm`,
        user_id: userId,
        agent_id: agentId,
        agent_system_name: agentSystemName,
        agent_name: agentName,
        data: { message, tool_kwargs: {} },
      });
    },
    [ws, agentSystemName, userId, agentId, agentName]
  );

  const start = useCallback(
    (inputs: Record<string, unknown>) => {
      if (!activeKey) return;
      // `startPending` (no runId) clears prior run state itself while retaining
      // the abandoned run id, so a separate `reset()` here would only erase the
      // id we need to guard against late events from the previous run.
      dispatch(startPending());
      // After `startPending`, which clears the previous run's inputs.
      dispatch(setRunInputs(inputs));
      send(encodeStart(activeKey, inputs));
    },
    [activeKey, dispatch, send]
  );

  const resume = useCallback(
    (payload: Omit<WorkflowActionPayload, "runId" | "workflowKey">) => {
      if (!activeKey || !run.runId) return;
      dispatch(startPending({ runId: run.runId }));
      send(
        encodeResume({
          runId: run.runId,
          workflowKey: activeKey,
          stepId: run.activePause?.stepId,
          pauseId: run.activePause?.pauseId,
          ...payload,
        })
      );
    },
    [activeKey, run.runId, run.activePause, dispatch, send]
  );

  const cancel = useCallback(() => {
    if (!activeKey || !run.runId) return;
    dispatch(cancelled());
    // A paused run is cancelled via resume; a running one via op=cancel.
    if (run.runStatus === "PAUSED") {
      send(
        encodeResume({
          runId: run.runId,
          workflowKey: activeKey,
          stepId: run.activePause?.stepId,
          pauseId: run.activePause?.pauseId,
          action: "cancel",
        })
      );
    } else {
      send(encodeCancel(run.runId, activeKey));
    }
  }, [activeKey, run.runId, run.runStatus, run.activePause, dispatch, send]);

  const refresh = useCallback(
    (runId: string) => {
      if (!canRun || !runId) return;
      send(encodeGet(runId));
    },
    [canRun, send]
  );

  const resetRun = useCallback(() => dispatch(reset()), [dispatch]);

  // Clear run state when the agent or the selected workflow changes so we never
  // show a run belonging to a different workflow.
  useEffect(() => {
    dispatch(reset());
    hasSentReattachRef.current = false;
  }, [agentId, workflowKey, dispatch]);

  // Reattach: on first connection, send op=get if there's a persisted runId for
  // this agent + workflow and no run is already active in Redux (e.g. after a
  // page reload).
  useEffect(() => {
    if (!canRun || hasSentReattachRef.current || run.runId !== null) return;
    const persisted = runs.load();
    if (!persisted) return;
    hasSentReattachRef.current = true;
    dispatch(startPending({ runId: persisted }));
    send(encodeGet(persisted));
  }, [canRun, runs, run.runId, dispatch, send]);

  // Persist runId to localStorage whenever one is assigned.
  useEffect(() => {
    if (run.runId) runs.save(run.runId);
  }, [run.runId, runs]);

  // Clear persisted runId when the run reaches a terminal state.
  useEffect(() => {
    if (
      run.runStatus === "COMPLETED" ||
      run.runStatus === "CANCELLED" ||
      run.runStatus === "FAILED"
    ) {
      runs.clear();
    }
  }, [run.runStatus, runs]);

  return {
    runId: run.runId,
    runStatus: run.runStatus,
    nodeStatus: run.nodeStatus,
    stepOutputs: run.stepOutputs,
    stepErrors: run.stepErrors,
    events: run.events,
    runInputs: run.runInputs,
    stepTimings: run.stepTimings,
    outputOrder: run.outputOrder,
    activePause: run.activePause,
    error: run.error,
    isStarting: run.isStarting,
    isConnected: ws.isConnected,
    connectionState: ws.connectionState,
    canRun,
    start,
    resume,
    cancel,
    refresh,
    resetRun,
  };
}
