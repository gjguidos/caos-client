import { describe, expect, it } from "vitest";
import {
  parseRunNotFound,
  parseRunSnapshot,
  parseWorkflowStepEvent,
} from "./parseRunEvent";

const presentedOutput = {
  ok: true,
  tool: "writer_tool",
  text: "Draft text",
  images: [{ url: "data:image/png;base64,iVBORw0", mime_type: "image/png" }],
  error: null,
};

describe("parseWorkflowStepEvent", () => {
  it("parses a terminal workflow.step event with output", () => {
    expect(
      parseWorkflowStepEvent({
        kind: "workflow.step",
        run_id: "run-1",
        workflow_key: "brief_writer",
        step_id: "write",
        status: "COMPLETED",
        output: presentedOutput,
      })
    ).toEqual({
      runId: "run-1",
      stepId: "write",
      status: "COMPLETED",
      output: presentedOutput,
    });
  });

  it("captures output error for failed events", () => {
    const output = { ...presentedOutput, ok: false, error: "tool failed" };

    expect(
      parseWorkflowStepEvent({
        kind: "workflow.step",
        run_id: "run-1",
        step_id: "write",
        status: "FAILED",
        output,
      })
    ).toEqual({
      runId: "run-1",
      stepId: "write",
      status: "FAILED",
      output,
      error: "tool failed",
    });
  });

  it("parses non-terminal step statuses (no output)", () => {
    expect(
      parseWorkflowStepEvent({
        kind: "workflow.step",
        run_id: "run-1",
        step_id: "write",
        status: "RUNNING",
      })
    ).toEqual({
      runId: "run-1",
      stepId: "write",
      status: "RUNNING",
    });
  });

  it("ignores non-step payloads and unknown statuses", () => {
    expect(parseWorkflowStepEvent({ kind: "workflow.run" })).toBeNull();
    // Legacy `event` discriminator is no longer accepted.
    expect(
      parseWorkflowStepEvent({
        event: "workflow.step",
        run_id: "run-1",
        step_id: "write",
        status: "COMPLETED",
      })
    ).toBeNull();
    expect(
      parseWorkflowStepEvent({
        kind: "workflow.step",
        run_id: "run-1",
        step_id: "write",
        status: "PENDING",
      })
    ).toBeNull();
  });

  it("requires run id and step id", () => {
    expect(
      parseWorkflowStepEvent({
        kind: "workflow.step",
        run_id: "run-1",
        status: "COMPLETED",
      })
    ).toBeNull();
    expect(
      parseWorkflowStepEvent({
        kind: "workflow.step",
        step_id: "write",
        status: "COMPLETED",
      })
    ).toBeNull();
  });
});

describe("parseRunSnapshot", () => {
  it("parses the canonical workflow.run snapshot contract", () => {
    const snapshot = parseRunSnapshot({
      kind: "workflow.run",
      run_id: "run-1",
      workflow_key: "brief_writer",
      workflow_name: "Brief Writer",
      status: "PAUSED",
      paused: {
        pause_id: "run-1:review",
        step_id: "review",
        prompt: "Approve?",
        actions: ["continue", "cancel"],
        workflow_key: "brief_writer",
        workflow_name: "Brief Writer",
      },
      error: null,
      outputs: { write: presentedOutput },
      steps: {
        write: {
          status: "COMPLETED",
          attempts: 1,
          started_at: "2026-01-01T00:00:00+00:00",
          completed_at: "2026-01-01T00:00:01+00:00",
          last_error: null,
        },
        review: { status: "PAUSED" },
        end: { status: "PENDING" },
      },
    });

    expect(snapshot).toEqual({
      kind: "workflow.run",
      runId: "run-1",
      workflowKey: "brief_writer",
      workflowName: "Brief Writer",
      runStatus: "PAUSED",
      steps: [
        {
          id: "write",
          status: "COMPLETED",
          startedAt: "2026-01-01T00:00:00+00:00",
          completedAt: "2026-01-01T00:00:01+00:00",
          attempts: 1,
        },
        { id: "review", status: "PAUSED" },
        { id: "end", status: "PENDING" },
      ],
      pause: {
        pauseId: "run-1:review",
        stepId: "review",
        prompt: "Approve?",
        actions: ["continue", "cancel"],
        workflowKey: "brief_writer",
        workflowName: "Brief Writer",
      },
      outputs: { write: presentedOutput },
      error: undefined,
    });
  });

  it("surfaces a step's last_error and run-level error", () => {
    const snapshot = parseRunSnapshot({
      kind: "workflow.run",
      run_id: "run-3",
      status: "FAILED",
      error: "workflow failed",
      paused: null,
      outputs: {},
      steps: {
        write: { status: "FAILED", last_error: "boom" },
      },
    });

    expect(snapshot?.runStatus).toBe("FAILED");
    expect(snapshot?.error).toBe("workflow failed");
    expect(snapshot?.steps).toEqual([
      { id: "write", status: "FAILED", error: "boom" },
    ]);
  });

  it("omits timings the backend did not send and rejects non-numeric attempts", () => {
    const snapshot = parseRunSnapshot({
      kind: "workflow.run",
      run_id: "run-5",
      status: "RUNNING",
      paused: null,
      outputs: {},
      steps: {
        write: { status: "RUNNING", started_at: "2026-01-01T00:00:00+00:00" },
        review: { status: "PENDING", attempts: "1", completed_at: "" },
      },
    });

    expect(snapshot?.steps).toEqual([
      {
        id: "write",
        status: "RUNNING",
        startedAt: "2026-01-01T00:00:00+00:00",
      },
      { id: "review", status: "PENDING" },
    ]);
  });

  it("returns no pause unless the run is PAUSED", () => {
    const snapshot = parseRunSnapshot({
      kind: "workflow.run",
      run_id: "run-4",
      status: "RUNNING",
      paused: {
        pause_id: "run-4:review",
        step_id: "review",
        prompt: "ignored",
      },
      outputs: {},
      steps: { write: { status: "RUNNING" } },
    });

    expect(snapshot?.pause).toBeNull();
  });

  it("locates the snapshot nested inside the .comm response envelope", () => {
    const snapshot = parseRunSnapshot({
      type: "chat",
      event: "orchestrator_agent.comm",
      response: {
        status: "Message sent",
        message: {
          status: "ok",
          message: {
            kind: "text",
            content: "A bike, hmm?",
            meta: { tool: "workflow" },
            data: {
              result: {
                kind: "workflow.run",
                status: "PAUSED",
                run_id: "wf_1780659762095424680",
                workflow_key: "mini_workflow_v1",
                workflow_name: "Mini Workflow (v1)",
                paused: {
                  pause_id: "wf_1780659762095424680:review_briefs",
                  step_id: "review_briefs",
                  prompt: "Review the briefs before starting.",
                  workflow_key: "mini_workflow_v1",
                  workflow_name: "Mini Workflow (v1)",
                  actions: [],
                },
                error: null,
                steps: {
                  write: {
                    status: "COMPLETED",
                    attempts: 1,
                    last_error: null,
                  },
                  review_briefs: { status: "PAUSED", attempts: 1 },
                  draw: { status: "PENDING", attempts: 0 },
                  end: { status: "PENDING", attempts: 0 },
                },
                outputs: { write: presentedOutput },
              },
            },
          },
          data: {
            result: {
              kind: "workflow.run",
              status: "PAUSED",
              run_id: "wf_1780659762095424680",
              steps: { write: { status: "COMPLETED" } },
              outputs: { write: presentedOutput },
            },
          },
          session_id: "ee749997",
        },
      },
    });

    expect(snapshot).toMatchObject({
      kind: "workflow.run",
      runId: "wf_1780659762095424680",
      workflowKey: "mini_workflow_v1",
      workflowName: "Mini Workflow (v1)",
      runStatus: "PAUSED",
      pause: {
        pauseId: "wf_1780659762095424680:review_briefs",
        stepId: "review_briefs",
        workflowKey: "mini_workflow_v1",
        workflowName: "Mini Workflow (v1)",
      },
      outputs: { write: presentedOutput },
    });
    expect(snapshot?.steps.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "write", status: "COMPLETED" },
      { id: "review_briefs", status: "PAUSED" },
      { id: "draw", status: "PENDING" },
      { id: "end", status: "PENDING" },
    ]);
    // Empty `actions` is omitted (PauseForm falls back to continue/cancel).
    expect(snapshot?.pause?.actions).toBeUndefined();
  });

  it("returns null unless a valid workflow.run snapshot is present", () => {
    expect(
      parseRunSnapshot({ result: { run_id: "r", status: "RUNNING" } })
    ).toBeNull();
    expect(
      parseRunSnapshot({ kind: "workflow.run", status: "RUNNING" })
    ).toBeNull();
    expect(parseRunSnapshot({ kind: "workflow.run", run_id: "r" })).toBeNull();
    expect(parseRunSnapshot(null)).toBeNull();
  });

  it("rejects a NOT_FOUND snapshot (not a real lifecycle status)", () => {
    expect(
      parseRunSnapshot({
        kind: "workflow.run",
        run_id: "wf_gone",
        status: "NOT_FOUND",
        steps: {},
        outputs: {},
      })
    ).toBeNull();
  });
});

describe("parseRunNotFound", () => {
  it("extracts the dead run id from a NOT_FOUND snapshot", () => {
    expect(
      parseRunNotFound({
        kind: "workflow.run",
        status: "NOT_FOUND",
        run_id: "wf_gone",
        workflow_key: null,
        workflow_name: null,
        paused: null,
        error: "Run not found: wf_gone",
        steps: {},
        outputs: {},
      })
    ).toEqual({ runId: "wf_gone" });
  });

  it("locates a NOT_FOUND snapshot nested in the .comm envelope", () => {
    expect(
      parseRunNotFound({
        response: {
          message: {
            data: {
              result: {
                kind: "workflow.run",
                status: "NOT_FOUND",
                run_id: "wf_nested",
                steps: {},
                outputs: {},
              },
            },
          },
        },
      })
    ).toEqual({ runId: "wf_nested" });
  });

  it("returns null for live and terminal snapshots", () => {
    expect(
      parseRunNotFound({
        kind: "workflow.run",
        status: "RUNNING",
        run_id: "wf_live",
        steps: { a: { status: "RUNNING" } },
      })
    ).toBeNull();
    expect(
      parseRunNotFound({ kind: "workflow.step", status: "NOT_FOUND" })
    ).toBeNull();
    expect(parseRunNotFound(null)).toBeNull();
  });
});
