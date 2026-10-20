import type {
  PresentedStepOutput,
  RunEvent,
  RunStatus,
  StepStatus,
  StepTiming,
  WorkflowPauseInfo,
  WorkflowRunSnapshot,
  WorkflowStepEvent,
} from "@/shared/lib/workflow/workflow.types";
import type { RootState } from "@/store";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Run state for the orchestration workspace. The reducers here are the
 * hardest-tested part of the feature: a live run is reconstructed from two
 * independent streams — fast, possibly-lossy `workflow.step` events
 * (`applyStepEvent`) and authoritative run snapshots from start/resume/get
 * responses (`reconcileFromSnapshot`). The snapshot always wins so the canvas
 * self-heals even if an event was missed.
 */
export interface WorkflowRunState {
  /** Active run id, or null before the first run is started. */
  runId: string | null;
  /** Overall run lifecycle status. */
  runStatus: RunStatus | null;
  /** Per-step status keyed by step id. */
  nodeStatus: Record<string, StepStatus>;
  /**
   * Per-step output keyed by step id. The single source for anything resolving
   * `${outputs.<stepId>.<key>}`: snapshot outputs merged over live events, with
   * the declared-output map the engine itself resolves against.
   */
  stepOutputs: Record<string, unknown>;
  /** Per-step error keyed by step id. */
  stepErrors: Record<string, string>;
  /** Active pause gate when the run is PAUSED, else null. */
  activePause: WorkflowPauseInfo | null;
  /** Run-level error message when FAILED. */
  error: string | null;
  /** Start/resume command sent, awaiting the first authoritative snapshot. */
  isStarting: boolean;
  /**
   * Run id of the run abandoned by the most recent fresh start, retained until
   * the new run's first event/snapshot assigns a real id. Guards the window
   * where `runId` is null: a late event/snapshot for the abandoned run would
   * otherwise reclaim the slice (since `isCurrentRun` accepts anything while
   * `runId` is null) and lock the UI onto the dead run.
   */
  abandonedRunId: string | null;
  /**
   * Chronological event log for the current run, oldest first. Derived on the
   * client (see `RunEvent`) and capped at `EVENT_CAP` — a long run would
   * otherwise grow this unbounded.
   */
  events: RunEvent[];
  /** Next event sequence number; only ever increases within a run. */
  eventSeq: number;
  /** Inputs the current run was started with. The backend never echoes these. */
  runInputs: Record<string, unknown> | null;
  /** Per-step timings from the snapshot, keyed by step id. */
  stepTimings: Record<string, StepTiming>;
  /**
   * Step ids in the order they first produced an output or error. Key insertion
   * order on `stepOutputs` cannot stand in for this: `reconcileFromSnapshot`
   * rebuilds those records, so a reload would silently degrade arrival order to
   * snapshot order.
   */
  outputOrder: string[];
}

/** Oldest events are dropped past this many. */
const EVENT_CAP = 500;

const initialState: WorkflowRunState = {
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
};

/**
 * Record a step the first time it has anything to show. Both reducers feed this
 * so the two paths cannot disagree about what counts as "produced".
 */
function trackOutputOrder(
  state: WorkflowRunState,
  stepId: string,
  hasOutput: boolean,
  hasError: boolean
) {
  if (!hasOutput && !hasError) return;
  if (state.outputOrder.includes(stepId)) return;
  state.outputOrder.push(stepId);
}

function getPresentedOutputError(output: unknown): string | undefined {
  const rec =
    output && typeof output === "object" && !Array.isArray(output)
      ? (output as Partial<PresentedStepOutput>)
      : null;
  return typeof rec?.error === "string" && rec.error ? rec.error : undefined;
}

/**
 * Drop the slice-assigned identity from one event variant. Written over a type
 * parameter so it distributes across `RunEvent`'s union: a plain
 * `Omit<RunEvent, …>` would collapse the variants to their shared keys and let a
 * step event through without a `stepId`.
 */
type Drafted<E> = E extends unknown
  ? Omit<E, "id" | "ts"> & { ts?: number }
  : never;

/** An event as callers supply it; the slice assigns `id` and defaults `ts`. */
export type RunEventInput = Drafted<RunEvent>;

function pushEvent(state: WorkflowRunState, event: RunEventInput) {
  state.events.push({
    ...event,
    id: String(state.eventSeq),
    ts: event.ts ?? Date.now(),
  });
  state.eventSeq += 1;
  if (state.events.length > EVENT_CAP) {
    state.events.splice(0, state.events.length - EVENT_CAP);
  }
}

function isCurrentRun(state: WorkflowRunState, runId: string | undefined) {
  // A late event/snapshot for the run we just abandoned must never reclaim the
  // slice, even while `runId` is still null awaiting the new run's snapshot.
  if (runId && runId === state.abandonedRunId) return false;
  return !state.runId || !runId || state.runId === runId;
}

const workflowRunSlice = createSlice({
  name: "workflowRun",
  initialState,
  reducers: {
    /** A start/resume command was dispatched; awaiting the snapshot. */
    startPending(state, action: PayloadAction<{ runId?: string } | undefined>) {
      if (action.payload?.runId) {
        // Resume / reattach of a known run: keep state, target that run, and
        // drop any pending abandon guard.
        state.isStarting = true;
        state.error = null;
        state.runId = action.payload.runId;
        state.abandonedRunId = null;
        return;
      }
      // Fresh start: clear all run state, but remember the run being abandoned
      // so a late event/snapshot for it can't reclaim the slice before the new
      // run's first snapshot assigns a real id.
      return {
        ...initialState,
        isStarting: true,
        abandonedRunId: state.runId,
      };
    },

    /** Clear all run state (e.g. switching agents / explicit reset). */
    reset() {
      return initialState;
    },

    /** Record the inputs a run was started with, so they stay readable after. */
    setRunInputs(state, action: PayloadAction<Record<string, unknown>>) {
      state.runInputs = action.payload;
    },

    /** Append a log line or any other externally-sourced event. */
    appendEvent(state, action: PayloadAction<RunEventInput>) {
      pushEvent(state, action.payload);
    },

    /** Mark the run cancelled locally (optimistic; snapshot confirms). */
    cancelled(state) {
      if (state.runStatus !== "CANCELLED") {
        pushEvent(state, {
          kind: "run",
          status: "CANCELLED",
          ...(state.runId ? { runId: state.runId } : {}),
        });
      }
      state.runStatus = "CANCELLED";
      state.isStarting = false;
      state.activePause = null;
    },

    /**
     * Apply one live `workflow.step` event. Best-effort: updates the single
     * step's status and merges any output. If this event beats the first run
     * snapshot, infer an active run; snapshots still own the authoritative
     * lifecycle.
     */
    applyStepEvent(state, action: PayloadAction<WorkflowStepEvent>) {
      const { runId, stepId, status, output, error } = action.payload;
      if (!stepId) return;
      if (!isCurrentRun(state, runId)) return;

      state.runId = state.runId ?? runId ?? null;
      // A new run's id has been claimed; the abandon guard has served its purpose.
      if (state.runId) state.abandonedRunId = null;
      state.runStatus = state.runStatus ?? "RUNNING";
      state.nodeStatus[stepId] = status;

      if (output !== undefined) {
        state.stepOutputs[stepId] = output;
      }
      const stepError = error ?? getPresentedOutputError(output);

      pushEvent(state, {
        kind: "step",
        stepId,
        status,
        ...(state.runId ? { runId: state.runId } : {}),
        ...(stepError ? { message: stepError } : {}),
      });

      if (stepError) {
        state.stepErrors[stepId] = stepError;
      }
      trackOutputOrder(state, stepId, output !== undefined, !!stepError);
      if (status === "FAILED" && stepError) {
        state.error = stepError;
      }
      // First sign of life clears the "starting" spinner.
      state.isStarting = false;
    },

    /**
     * Reconcile from an authoritative run snapshot. Rebuilds node statuses from
     * `steps` (snapshot wins over inferred event state), sets run status,
     * sets/clears the active pause, and merges outputs (keyed by step id).
     */
    reconcileFromSnapshot(state, action: PayloadAction<WorkflowRunSnapshot>) {
      const snapshot = action.payload;
      if (!isCurrentRun(state, snapshot.runId)) return;

      const previousRunStatus = state.runStatus;
      state.runId = snapshot.runId || state.runId;
      if (state.runId) state.abandonedRunId = null;
      state.runStatus = snapshot.runStatus;
      state.isStarting = false;

      // Rebuild node statuses authoritatively from the snapshot's steps (so a
      // snapshot can drop ghost steps an event inferred). Per-step outputs and
      // errors are instead *merged* over what live events already delivered: a
      // completed step's output is monotonic, so an interim snapshot whose
      // `outputs` map hasn't caught up yet must not wipe an output a fast
      // `workflow.step` event already surfaced.
      const previousNodeStatus = state.nodeStatus;
      const nodeStatus: Record<string, StepStatus> = {};
      const stepOutputs: Record<string, unknown> = { ...state.stepOutputs };
      const stepErrors: Record<string, string> = { ...state.stepErrors };
      const stepTimings: Record<string, StepTiming> = {};
      const outputs = snapshot.outputs ?? {};
      for (const step of snapshot.steps ?? []) {
        if (!step?.id) continue;
        nodeStatus[step.id] = step.status;
        const output = outputs[step.id];
        if (output !== undefined) {
          stepOutputs[step.id] = output;
        }
        const stepError = step.error ?? getPresentedOutputError(output);
        if (stepError) {
          stepErrors[step.id] = stepError;
        }
        trackOutputOrder(
          state,
          step.id,
          stepOutputs[step.id] !== undefined,
          !!stepErrors[step.id]
        );
        if (step.startedAt || step.completedAt || step.attempts !== undefined) {
          stepTimings[step.id] = {
            ...(step.startedAt ? { startedAt: step.startedAt } : {}),
            ...(step.completedAt ? { completedAt: step.completedAt } : {}),
            ...(step.attempts !== undefined ? { attempts: step.attempts } : {}),
          };
        }

        // Log only genuine transitions, so repeated `op=get` polling of an
        // unchanged run doesn't flood the event log. A step first seen as
        // PENDING has not transitioned to anything worth recording.
        if (
          previousNodeStatus[step.id] !== step.status &&
          step.status !== "PENDING"
        ) {
          pushEvent(state, {
            kind: "step",
            stepId: step.id,
            status: step.status,
            runId: snapshot.runId,
            ...(stepError ? { message: stepError } : {}),
          });
        }
      }
      state.nodeStatus = nodeStatus;
      state.stepOutputs = stepOutputs;
      state.stepErrors = stepErrors;
      state.stepTimings = stepTimings;

      if (previousRunStatus !== snapshot.runStatus) {
        pushEvent(state, {
          kind: "run",
          status: snapshot.runStatus,
          runId: snapshot.runId,
          ...(snapshot.error ? { message: snapshot.error } : {}),
        });
      }

      state.activePause =
        snapshot.runStatus === "PAUSED" ? (snapshot.pause ?? null) : null;

      state.error =
        snapshot.runStatus === "FAILED"
          ? (snapshot.error ?? state.error)
          : null;
    },
  },
});

export const {
  startPending,
  reset,
  setRunInputs,
  appendEvent,
  cancelled,
  applyStepEvent,
  reconcileFromSnapshot,
} = workflowRunSlice.actions;

export default workflowRunSlice.reducer;

// ---- Selectors ----
export const selectWorkflowRun = (state: RootState) => state.workflowRun;
export const selectRunStatus = (state: RootState) =>
  state.workflowRun.runStatus;
export const selectNodeStatus = (state: RootState) =>
  state.workflowRun.nodeStatus;
export const selectStepOutputs = (state: RootState) =>
  state.workflowRun.stepOutputs;
export const selectStepErrors = (state: RootState) =>
  state.workflowRun.stepErrors;
export const selectActivePause = (state: RootState) =>
  state.workflowRun.activePause;
export const selectRunEvents = (state: RootState) => state.workflowRun.events;
export const selectRunInputs = (state: RootState) =>
  state.workflowRun.runInputs;
export const selectStepTimings = (state: RootState) =>
  state.workflowRun.stepTimings;
export const selectOutputOrder = (state: RootState) =>
  state.workflowRun.outputOrder;
