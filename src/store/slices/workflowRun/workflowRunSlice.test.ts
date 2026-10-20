import type {
  WorkflowRunSnapshot,
  WorkflowStepEvent,
} from "@/shared/lib/workflow/workflow.types";
import { statusOf, stepIdOf } from "@/shared/lib/workflow/runEvents";
import { describe, expect, it } from "vitest";
import reducer, {
  appendEvent,
  applyStepEvent,
  cancelled,
  reconcileFromSnapshot,
  reset,
  setRunInputs,
  startPending,
  type WorkflowRunState,
} from "./workflowRunSlice";

const initial = reducer(undefined, { type: "@@INIT" });

function event(overrides: Partial<WorkflowStepEvent>): WorkflowStepEvent {
  return { runId: "run-1", stepId: "a", status: "COMPLETED", ...overrides };
}

function snapshot(
  overrides: Partial<WorkflowRunSnapshot>
): WorkflowRunSnapshot {
  return { runId: "run-1", runStatus: "RUNNING", steps: [], ...overrides };
}

describe("workflowRunSlice — initial / lifecycle", () => {
  it("has a clean initial state", () => {
    expect(initial).toEqual<WorkflowRunState>({
      runId: null,
      runStatus: null,
      nodeStatus: {},
      stepOutputs: {},
      stepErrors: {},
      activePause: null,
      error: null,
      isStarting: false,
      abandonedRunId: null,
      events: [],
      eventSeq: 0,
      runInputs: null,
      stepTimings: {},
      outputOrder: [],
    });
  });

  it("startPending sets the starting flag and clears prior error", () => {
    const state = reducer({ ...initial, error: "boom" }, startPending());
    expect(state.isStarting).toBe(true);
    expect(state.error).toBeNull();
  });

  it("startPending can carry a known runId (resume)", () => {
    const state = reducer(initial, startPending({ runId: "run-9" }));
    expect(state.runId).toBe("run-9");
  });

  it("startPending without a runId clears prior run state (fresh start)", () => {
    const dirty: WorkflowRunState = {
      ...initial,
      runId: "old",
      runStatus: "RUNNING",
      nodeStatus: { a: "COMPLETED" },
      stepOutputs: { a: "x" },
    };
    const state = reducer(dirty, startPending());
    expect(state.runId).toBeNull();
    expect(state.runStatus).toBeNull();
    expect(state.nodeStatus).toEqual({});
    expect(state.stepOutputs).toEqual({});
    expect(state.isStarting).toBe(true);
    // The abandoned run is remembered so its late events can't reclaim state.
    expect(state.abandonedRunId).toBe("old");
  });

  it("startPending with a runId clears any pending abandon guard", () => {
    const fresh = reducer({ ...initial, runId: "old" }, startPending());
    expect(fresh.abandonedRunId).toBe("old");
    const resumed = reducer(fresh, startPending({ runId: "old" }));
    expect(resumed.runId).toBe("old");
    expect(resumed.abandonedRunId).toBeNull();
  });

  it("reset returns to initial", () => {
    const dirty: WorkflowRunState = {
      ...initial,
      runId: "x",
      runStatus: "RUNNING",
      nodeStatus: { a: "RUNNING" },
    };
    expect(reducer(dirty, reset())).toEqual(initial);
  });

  it("cancelled marks the run cancelled and clears pause", () => {
    const paused: WorkflowRunState = {
      ...initial,
      runStatus: "PAUSED",
      activePause: { pauseId: "p", stepId: "a", prompt: "?" },
    };
    const state = reducer(paused, cancelled());
    expect(state.runStatus).toBe("CANCELLED");
    expect(state.activePause).toBeNull();
  });
});

describe("workflowRunSlice — applyStepEvent", () => {
  it("sets a node's status", () => {
    const state = reducer(initial, applyStepEvent(event({ stepId: "a" })));
    expect(state.nodeStatus.a).toBe("COMPLETED");
  });

  it("stores per-step output keyed by step id", () => {
    const state = reducer(
      initial,
      applyStepEvent(
        event({ stepId: "step-1", status: "COMPLETED", output: { foo: "bar" } })
      )
    );
    expect(state.stepOutputs["step-1"]).toEqual({ foo: "bar" });
  });

  it("stores per-step error keyed by step id", () => {
    const state = reducer(
      initial,
      applyStepEvent(
        event({ stepId: "fail-step", status: "FAILED", error: "oops" })
      )
    );
    expect(state.stepErrors["fail-step"]).toBe("oops");
  });

  it("records the error message on failure", () => {
    const state = reducer(
      initial,
      applyStepEvent(event({ status: "FAILED", error: "kaboom" }))
    );
    expect(state.nodeStatus.a).toBe("FAILED");
    expect(state.error).toBe("kaboom");
  });

  it("clears the starting spinner on first running/completed event", () => {
    const starting = reducer(initial, startPending());
    expect(starting.isStarting).toBe(true);
    const state = reducer(
      starting,
      applyStepEvent(event({ status: "COMPLETED" }))
    );
    expect(state.isStarting).toBe(false);
  });

  it("keeps the run active when a step event arrives before the run snapshot", () => {
    const starting = reducer(initial, startPending());
    const state = reducer(
      starting,
      applyStepEvent(event({ runId: "run-early", status: "RUNNING" }))
    );

    expect(state.runId).toBe("run-early");
    expect(state.runStatus).toBe("RUNNING");
    expect(state.isStarting).toBe(false);
  });

  it("ignores a late event for the run abandoned by a fresh start", () => {
    // A run was active, then the user started a new run (runId now null,
    // isStarting true, previous run remembered as abandoned).
    const started = reducer({ ...initial, runId: "run-old" }, startPending());

    // A straggling event for the old run arrives before the new run's snapshot.
    const state = reducer(
      started,
      applyStepEvent(
        event({ runId: "run-old", stepId: "a", status: "COMPLETED" })
      )
    );

    // It must not reclaim the slice for the dead run.
    expect(state.runId).toBeNull();
    expect(state.nodeStatus.a).toBeUndefined();
    expect(state.isStarting).toBe(true);

    // The new run's first event still binds correctly and drops the guard.
    const bound = reducer(
      state,
      applyStepEvent(
        event({ runId: "run-new", stepId: "b", status: "RUNNING" })
      )
    );
    expect(bound.runId).toBe("run-new");
    expect(bound.nodeStatus.b).toBe("RUNNING");
    expect(bound.abandonedRunId).toBeNull();
  });

  it("ignores an event with no step id", () => {
    const state = reducer(initial, applyStepEvent(event({ stepId: "" })));
    expect(state.nodeStatus).toEqual({});
  });

  it("ignores a step event for a different active run", () => {
    const active = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          runId: "run-current",
          steps: [{ id: "a", status: "RUNNING" }],
        })
      )
    );

    const state = reducer(
      active,
      applyStepEvent(
        event({
          runId: "run-stale",
          stepId: "a",
          status: "COMPLETED",
          output: "stale-output",
        })
      )
    );

    expect(state.runId).toBe("run-current");
    expect(state.nodeStatus.a).toBe("RUNNING");
    expect(state.stepOutputs.a).toBeUndefined();
  });
});

describe("workflowRunSlice — reconcileFromSnapshot (authoritative)", () => {
  it("rebuilds node statuses from the snapshot's steps", () => {
    const state = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          steps: [
            { id: "a", status: "COMPLETED" },
            { id: "b", status: "RUNNING" },
          ],
        })
      )
    );
    expect(state.nodeStatus).toEqual({
      a: "COMPLETED",
      b: "RUNNING",
    });
    expect(state.runId).toBe("run-1");
    expect(state.runStatus).toBe("RUNNING");
    expect(state.isStarting).toBe(false);
  });

  it("overwrites inferred event state (snapshot wins)", () => {
    // Event said 'a' and 'b' finished; snapshot says only 'a' exists.
    const afterEvent = reducer(
      initial,
      applyStepEvent(event({ stepId: "a", status: "COMPLETED" }))
    );
    const withGhost = reducer(
      afterEvent,
      applyStepEvent(event({ stepId: "b", status: "COMPLETED" }))
    );
    const reconciled = reducer(
      withGhost,
      reconcileFromSnapshot(
        snapshot({ steps: [{ id: "a", status: "COMPLETED" }] })
      )
    );
    expect(reconciled.nodeStatus).toEqual({ a: "COMPLETED" });
  });

  it("sets activePause when PAUSED and clears it otherwise", () => {
    const paused = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          runStatus: "PAUSED",
          pause: { pauseId: "p1", stepId: "gate", prompt: "Approve?" },
        })
      )
    );
    expect(paused.runStatus).toBe("PAUSED");
    expect(paused.activePause).toEqual({
      pauseId: "p1",
      stepId: "gate",
      prompt: "Approve?",
    });

    const resumed = reducer(
      paused,
      reconcileFromSnapshot(snapshot({ runStatus: "RUNNING" }))
    );
    expect(resumed.activePause).toBeNull();
  });

  it("surfaces a run-level error when FAILED and clears it when not", () => {
    const failed = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({ runStatus: "FAILED", error: "pipeline blew up" })
      )
    );
    expect(failed.error).toBe("pipeline blew up");

    const ok = reducer(
      failed,
      reconcileFromSnapshot(snapshot({ runStatus: "COMPLETED" }))
    );
    expect(ok.error).toBeNull();
  });

  it("rebuilds stepOutputs keyed by step id from snapshot", () => {
    const outputA = {
      ok: true,
      tool: "tool_a",
      message: "A",
      renderables: [],
      result: { result: "a" },
    };
    const state = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          steps: [
            { id: "step-a", status: "COMPLETED" },
            { id: "step-b", status: "COMPLETED" },
            { id: "step-c", status: "RUNNING" }, // no output yet
          ],
          outputs: { "step-a": outputA, "step-b": "b-result" },
        })
      )
    );
    expect(state.stepOutputs).toEqual({
      "step-a": outputA,
      "step-b": "b-result",
    });
  });

  it("preserves event-sourced step output when an interim snapshot omits it", () => {
    // step-a completes via a fast event carrying its output...
    const afterEvent = reducer(
      initial,
      applyStepEvent(
        event({ stepId: "step-a", status: "COMPLETED", output: "a-result" })
      )
    );
    // ...then an interim snapshot arrives (step-b now running) whose outputs map
    // hasn't caught up to step-a yet. It must not wipe step-a's output.
    const reconciled = reducer(
      afterEvent,
      reconcileFromSnapshot(
        snapshot({
          steps: [
            { id: "step-a", status: "COMPLETED" },
            { id: "step-b", status: "RUNNING" },
          ],
          outputs: {},
        })
      )
    );
    expect(reconciled.stepOutputs["step-a"]).toBe("a-result");
  });

  it("lets the snapshot's output win over an earlier event output", () => {
    const afterEvent = reducer(
      initial,
      applyStepEvent(
        event({ stepId: "step-a", status: "COMPLETED", output: "stale" })
      )
    );
    const reconciled = reducer(
      afterEvent,
      reconcileFromSnapshot(
        snapshot({
          steps: [{ id: "step-a", status: "COMPLETED" }],
          outputs: { "step-a": "fresh" },
        })
      )
    );
    expect(reconciled.stepOutputs["step-a"]).toBe("fresh");
  });

  it("rebuilds stepErrors keyed by step id from snapshot", () => {
    const state = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          runStatus: "FAILED",
          steps: [
            { id: "ok-step", status: "COMPLETED" },
            { id: "fail-step", status: "FAILED", error: "step blew up" },
          ],
        })
      )
    );
    expect(state.stepErrors).toEqual({
      "fail-step": "step blew up",
    });
  });

  it("ignores a late snapshot for the run abandoned by a fresh start", () => {
    // Old run active, then a fresh start abandons it (runId null, isStarting).
    const started = reducer({ ...initial, runId: "run-old" }, startPending());

    // A stale snapshot for the old run arrives after the start.
    const stale = reducer(
      started,
      reconcileFromSnapshot(
        snapshot({
          runId: "run-old",
          runStatus: "COMPLETED",
          steps: [{ id: "a", status: "COMPLETED" }],
          outputs: { a: "stale-output" },
        })
      )
    );
    expect(stale.runId).toBeNull();
    expect(stale.runStatus).toBeNull();
    expect(stale.nodeStatus.a).toBeUndefined();
    expect(stale.isStarting).toBe(true);

    // The real snapshot for the new run is honoured and clears the guard.
    const fresh = reducer(
      stale,
      reconcileFromSnapshot(
        snapshot({
          runId: "run-new",
          runStatus: "RUNNING",
          steps: [{ id: "b", status: "RUNNING" }],
        })
      )
    );
    expect(fresh.runId).toBe("run-new");
    expect(fresh.nodeStatus.b).toBe("RUNNING");
    expect(fresh.abandonedRunId).toBeNull();
  });

  it("ignores an authoritative snapshot for a different active run", () => {
    const active = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          runId: "run-current",
          steps: [{ id: "a", status: "RUNNING" }],
        })
      )
    );

    const state = reducer(
      active,
      reconcileFromSnapshot(
        snapshot({
          runId: "run-stale",
          runStatus: "COMPLETED",
          steps: [{ id: "a", status: "COMPLETED" }],
          outputs: { a: "stale-output" },
        })
      )
    );

    expect(state.runId).toBe("run-current");
    expect(state.runStatus).toBe("RUNNING");
    expect(state.nodeStatus.a).toBe("RUNNING");
    expect(state.stepOutputs.a).toBeUndefined();
  });
});

describe("workflowRunSlice — event log", () => {
  it("logs a step event with a stable, monotonic id", () => {
    let state = reducer(initial, applyStepEvent(event({ status: "RUNNING" })));
    state = reducer(state, applyStepEvent(event({ status: "COMPLETED" })));

    expect(
      state.events.map((e) => [e.id, e.kind, stepIdOf(e), statusOf(e)])
    ).toEqual([
      ["0", "step", "a", "RUNNING"],
      ["1", "step", "a", "COMPLETED"],
    ]);
    expect(state.events[0].ts).toBeTypeOf("number");
  });

  it("carries an output-derived error onto the step event message", () => {
    const state = reducer(
      initial,
      applyStepEvent(
        event({
          status: "FAILED",
          output: { ok: false, tool: "writer", images: [], error: "boom" },
        })
      )
    );

    expect(state.events[0].message).toBe("boom");
  });

  it("logs snapshot transitions once, not on every repeated snapshot", () => {
    const snap = snapshot({
      runStatus: "RUNNING",
      steps: [
        { id: "a", status: "COMPLETED" },
        { id: "b", status: "RUNNING" },
      ],
    });

    let state = reducer(initial, reconcileFromSnapshot(snap));
    const afterFirst = state.events.length;
    state = reducer(state, reconcileFromSnapshot(snap));

    expect(afterFirst).toBe(3); // a COMPLETED, b RUNNING, run RUNNING
    expect(state.events).toHaveLength(afterFirst);
  });

  it("does not log a step first seen as PENDING", () => {
    const state = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({ steps: [{ id: "a", status: "PENDING" }] })
      )
    );

    expect(state.events.map((e) => e.kind)).toEqual(["run"]);
  });

  it("logs the run status transition after its step transitions", () => {
    const running = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({ steps: [{ id: "a", status: "RUNNING" }] })
      )
    );
    const state = reducer(
      running,
      reconcileFromSnapshot(
        snapshot({
          runStatus: "FAILED",
          error: "workflow failed",
          steps: [{ id: "a", status: "FAILED", error: "boom" }],
        })
      )
    );

    expect(state.events.slice(-2)).toEqual([
      expect.objectContaining({
        kind: "step",
        status: "FAILED",
        message: "boom",
      }),
      expect.objectContaining({
        kind: "run",
        status: "FAILED",
        message: "workflow failed",
      }),
    ]);
  });

  it("logs a cancellation once", () => {
    let state = reducer(initial, applyStepEvent(event({ status: "RUNNING" })));
    state = reducer(state, cancelled());
    const afterCancel = state.events.length;
    state = reducer(state, cancelled());

    expect(state.events.at(-1)).toMatchObject({
      kind: "run",
      status: "CANCELLED",
    });
    expect(state.events).toHaveLength(afterCancel);
  });

  it("appends externally-sourced log events", () => {
    const state = reducer(
      initial,
      appendEvent({
        kind: "log",
        message: "fetching sources",
        stepId: "a",
        inferredStep: true,
      })
    );

    expect(state.events[0]).toMatchObject({
      id: "0",
      kind: "log",
      message: "fetching sources",
      stepId: "a",
      inferredStep: true,
    });
  });

  it("caps the log at 500 events, dropping the oldest", () => {
    let state = initial;
    for (let i = 0; i < 520; i += 1) {
      state = reducer(state, appendEvent({ kind: "log", message: `m${i}` }));
    }

    expect(state.events).toHaveLength(500);
    expect(state.events[0].message).toBe("m20");
    expect(state.events.at(-1)).toMatchObject({ message: "m519", id: "519" });
  });

  it("clears the log on reset and on a fresh start", () => {
    const withEvents = reducer(
      initial,
      appendEvent({ kind: "log", message: "noise" })
    );

    expect(reducer(withEvents, reset()).events).toEqual([]);
    expect(reducer(withEvents, startPending()).events).toEqual([]);
  });

  it("keeps the log when resuming a known run", () => {
    const withEvents = reducer(
      initial,
      appendEvent({ kind: "log", message: "noise" })
    );
    const state = reducer(withEvents, startPending({ runId: "run-1" }));

    expect(state.events).toHaveLength(1);
  });

  it("does not log events for a run that was abandoned", () => {
    const active = reducer(
      reducer(initial, startPending()),
      applyStepEvent(event({ runId: "run-current", status: "RUNNING" }))
    );
    const state = reducer(
      reducer(active, startPending()),
      applyStepEvent(event({ runId: "run-current", status: "COMPLETED" }))
    );

    expect(state.events).toEqual([]);
  });
});

describe("workflowRunSlice — outputOrder", () => {
  it("appends a step the first time it produces an output", () => {
    let state = reducer(initial, applyStepEvent(event({ stepId: "b" })));
    state = reducer(
      state,
      applyStepEvent(event({ stepId: "a", output: "first" }))
    );
    state = reducer(
      state,
      applyStepEvent(event({ stepId: "b", output: "second" }))
    );

    expect(state.outputOrder).toEqual(["a", "b"]);
  });

  it("tracks a step that only ever reported an error", () => {
    const state = reducer(
      initial,
      applyStepEvent(event({ stepId: "a", status: "FAILED", error: "boom" }))
    );

    expect(state.outputOrder).toEqual(["a"]);
  });

  it("does not duplicate a step on a later event", () => {
    let state = reducer(
      initial,
      applyStepEvent(event({ stepId: "a", output: "first" }))
    );
    state = reducer(
      state,
      applyStepEvent(event({ stepId: "a", output: "revised" }))
    );

    expect(state.outputOrder).toEqual(["a"]);
  });

  it("keeps live arrival order when a later snapshot reorders the steps", () => {
    let state = reducer(
      initial,
      applyStepEvent(event({ stepId: "b", output: "second" }))
    );
    state = reducer(
      state,
      reconcileFromSnapshot(
        snapshot({
          steps: [
            { id: "a", status: "COMPLETED" },
            { id: "b", status: "COMPLETED" },
          ],
          outputs: { a: "first", b: "second" },
        })
      )
    );

    expect(state.outputOrder).toEqual(["b", "a"]);
  });

  it("clears on reset", () => {
    const state = reducer({ ...initial, outputOrder: ["a"] }, reset());
    expect(state.outputOrder).toEqual([]);
  });

  it("clears on a fresh start", () => {
    const state = reducer(
      { ...initial, runId: "run-1", outputOrder: ["a"] },
      startPending()
    );
    expect(state.outputOrder).toEqual([]);
  });
});

describe("workflowRunSlice — run inputs and timings", () => {
  it("records the inputs a run was started with", () => {
    const state = reducer(initial, setRunInputs({ topic: "Q3 launch" }));
    expect(state.runInputs).toEqual({ topic: "Q3 launch" });
  });

  it("rebuilds step timings from the snapshot", () => {
    const state = reducer(
      initial,
      reconcileFromSnapshot(
        snapshot({
          steps: [
            {
              id: "a",
              status: "COMPLETED",
              startedAt: "2026-01-01T00:00:00Z",
              completedAt: "2026-01-01T00:00:04Z",
              attempts: 1,
            },
            { id: "b", status: "PENDING" },
          ],
        })
      )
    );

    expect(state.stepTimings).toEqual({
      a: {
        startedAt: "2026-01-01T00:00:00Z",
        completedAt: "2026-01-01T00:00:04Z",
        attempts: 1,
      },
    });
  });
});
