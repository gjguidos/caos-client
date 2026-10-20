import type {
  RunStatus,
  StepStatus,
  WorkflowPauseInfo,
  WorkflowRunSnapshot,
  WorkflowStepEvent,
} from "./workflow.types";

const STEP_STATUSES: readonly StepStatus[] = [
  "PENDING",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
  "CANCELLED",
];

const RUN_STATUSES: readonly RunStatus[] = [
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

/** Step-event statuses we accept (a live step never reports PENDING/SKIPPED). */
const STEP_EVENT_STATUSES: readonly StepStatus[] = [
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeStepStatus(value: unknown): StepStatus | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  return STEP_STATUSES.includes(upper as StepStatus)
    ? (upper as StepStatus)
    : null;
}

function normalizeRunStatus(value: unknown): RunStatus | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  return RUN_STATUSES.includes(upper as RunStatus)
    ? (upper as RunStatus)
    : null;
}

function looksLikeWorkflowRunSnapshot(value: Record<string, unknown>): boolean {
  return (
    value.kind === "workflow.run" ||
    (typeof value.run_id === "string" &&
      typeof value.status === "string" &&
      asRecord(value.steps) !== null)
  );
}

const WRAPPER_KEYS = ["response", "message", "data", "result"] as const;

function findWorkflowNode(
  raw: unknown,
  predicate: (node: Record<string, unknown>) => boolean,
  depth = 0
): Record<string, unknown> | null {
  const node = asRecord(raw);
  if (!node) return null;
  if (predicate(node)) return node;
  if (depth >= 6) return null;
  for (const key of WRAPPER_KEYS) {
    if (node[key] !== undefined) {
      const found = findWorkflowNode(node[key], predicate, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function normalizePause(value: unknown): WorkflowPauseInfo | null {
  const pause = asRecord(value);
  if (!pause) return null;
  const stepId = typeof pause.step_id === "string" ? pause.step_id : "";
  const pauseId = typeof pause.pause_id === "string" ? pause.pause_id : "";
  if (!stepId || !pauseId) return null;

  const actions = Array.isArray(pause.actions)
    ? pause.actions.filter((a): a is string => typeof a === "string")
    : undefined;

  return {
    pauseId,
    stepId,
    prompt:
      typeof pause.prompt === "string"
        ? pause.prompt
        : "Workflow paused. Review before continuing.",
    ...(actions && actions.length ? { actions } : {}),
    ...(typeof pause.workflow_key === "string" || pause.workflow_key === null
      ? { workflowKey: pause.workflow_key }
      : {}),
    ...(typeof pause.workflow_name === "string"
      ? { workflowName: pause.workflow_name }
      : {}),
  };
}

function normalizeSteps(value: unknown): WorkflowRunSnapshot["steps"] {
  const steps = asRecord(value);
  if (!steps) return [];

  return Object.entries(steps)
    .map(([id, runtime]) => {
      const rec = asRecord(runtime);
      const status = normalizeStepStatus(rec ? rec.status : runtime);
      if (!id || !status) return null;

      const error =
        typeof rec?.last_error === "string" && rec.last_error
          ? rec.last_error
          : undefined;

      const startedAt =
        typeof rec?.started_at === "string" && rec.started_at
          ? rec.started_at
          : undefined;
      const completedAt =
        typeof rec?.completed_at === "string" && rec.completed_at
          ? rec.completed_at
          : undefined;
      const attempts =
        typeof rec?.attempts === "number" && Number.isFinite(rec.attempts)
          ? rec.attempts
          : undefined;

      return {
        id,
        status,
        ...(error ? { error } : {}),
        ...(startedAt ? { startedAt } : {}),
        ...(completedAt ? { completedAt } : {}),
        ...(attempts !== undefined ? { attempts } : {}),
      };
    })
    .filter((step): step is NonNullable<typeof step> => step !== null);
}

export function parseWorkflowStepEvent(raw: unknown): WorkflowStepEvent | null {
  const container = findWorkflowNode(
    raw,
    (node) => node.kind === "workflow.step"
  );
  if (!container) return null;

  const runId = typeof container.run_id === "string" ? container.run_id : "";
  const stepId = typeof container.step_id === "string" ? container.step_id : "";
  const status = normalizeStepStatus(container.status);

  if (!runId || !stepId || !status || !STEP_EVENT_STATUSES.includes(status)) {
    return null;
  }

  const output = container.output;
  const outputError = asRecord(output)?.error;
  const error =
    (typeof container.error === "string" && container.error) ||
    (typeof outputError === "string" && outputError) ||
    undefined;

  return {
    runId,
    stepId,
    status: status as WorkflowStepEvent["status"],
    ...(output !== undefined ? { output } : {}),
    ...(error ? { error } : {}),
  };
}

export function parseRunNotFound(raw: unknown): { runId: string } | null {
  const node = findWorkflowNode(
    raw,
    (n) =>
      n.kind === "workflow.run" &&
      typeof n.status === "string" &&
      n.status.toUpperCase() === "NOT_FOUND"
  );
  if (!node) return null;
  return { runId: typeof node.run_id === "string" ? node.run_id : "" };
}

export function parseRunSnapshot(raw: unknown): WorkflowRunSnapshot | null {
  const snapshot = findWorkflowNode(raw, looksLikeWorkflowRunSnapshot);
  if (!snapshot) return null;

  const runId = typeof snapshot.run_id === "string" ? snapshot.run_id : "";
  const runStatus = normalizeRunStatus(snapshot.status);
  if (!runId || !runStatus) return null;

  const outputs = asRecord(snapshot.outputs) ?? {};

  return {
    kind: "workflow.run",
    runId,
    workflowKey:
      typeof snapshot.workflow_key === "string" ||
      snapshot.workflow_key === null
        ? snapshot.workflow_key
        : undefined,
    workflowName:
      typeof snapshot.workflow_name === "string"
        ? snapshot.workflow_name
        : undefined,
    runStatus,
    steps: normalizeSteps(snapshot.steps),
    pause: runStatus === "PAUSED" ? normalizePause(snapshot.paused) : null,
    outputs,
    error:
      typeof snapshot.error === "string" && snapshot.error
        ? snapshot.error
        : undefined,
  };
}
