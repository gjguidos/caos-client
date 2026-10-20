/**
 * Shared workflow protocol/domain types.
 *
 * These are used by chat pause widgets, the orchestration workspace, and the
 * workflow run Redux slice. Keep backend transport normalization here rather
 * than under a route folder so every caller shares one contract boundary.
 */

/** A workflow step's kind. */
export type StepType = "tool" | "pause" | "set" | "wait_event" | "end";

/**
 * A declared workflow input, as the builder canvas names it. Not a `StepType` —
 * it never executes and never reaches the definition — but the palette, the node
 * header and the builder's selection all have to name it, so it belongs beside
 * `StepType` in the shared vocabulary rather than in whichever consumer happened
 * to need it first.
 */
export const WORKFLOW_INPUT_KIND = "workflowInput";

/** A step kind, or the non-step input kind the builder canvas also renders. */
export type NodeKind = StepType | typeof WORKFLOW_INPUT_KIND;

/** How the workflow's steps are ordered when dependencies are not explicit. */
export type ExecutionMode = "sequential" | "parallel" | "dag" | (string & {});

/** Per-step lifecycle status during a run. */
export type StepStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLED";

/** Overall run lifecycle status. */
export type RunStatus =
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/** Run statuses from which a run never moves again. */
export const TERMINAL_RUN_STATUSES: ReadonlySet<RunStatus> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

/** A pause gate's prompt shown to the operator before continuing. */
export interface StepPause {
  prompt?: string;
}

/** A single authored step in a workflow definition. */
export interface WorkflowStep {
  id: string;
  type: StepType;
  /** e.g. "@writer --foo=bar" - the leading `@<tool>` is the invoked tool. */
  command?: string;
  /** State key the step's output is saved under. */
  save_as?: string;
  /** Explicit successor step ids. */
  next?: string[];
  /** Explicit predecessor step ids. */
  depends_on?: string[];
  pause?: StepPause;
  set?: Record<string, unknown>;
  wait_for?: unknown;
  /**
   * Tool steps only: maps a tool file-input slot name to a single `${…}`
   * reference that resolves to an upstream `image` output. The backend rejects
   * this on non-tool steps and requires each value to be exactly one reference
   * (no interpolation, concatenation, or `|default`).
   */
  file_bindings?: Record<string, string>;
  // ---- Authoring metadata (optional; used for nicer node labels) ----
  label?: string;
  description?: string;
  ui?: Record<string, unknown>;
}

/** A complete workflow definition. */
export interface WorkflowDefinition {
  execution_mode?: ExecutionMode;
  steps: WorkflowStep[];
}

/** Widget kinds an author can pick for a declared workflow input. */
export type WorkflowInputWidget =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "object"
  | "file";

/** A single option for a `select` workflow input. */
export interface WorkflowInputOption {
  value: string;
  label?: string;
}

/**
 * A runtime-configurable input declared on a workflow (the values a user
 * supplies when starting a run via `@workflow --op=start --inputs={…}`).
 * Mirrors the backend `WorkflowInputField` (note the naming: `key` + `input`,
 * not `name`/`type`) and deliberately reuses the tool `ui.admin.fields`
 * vocabulary.
 *
 * The shape is closed so the editor keeps a real prop contract. The backend's
 * `extra="allow"` means unknown keys could appear on the wire; they survive the
 * round-trip at runtime (the loader and `updateInput` only ever spread existing
 * objects, never reconstruct them) without needing to widen this type.
 */
export interface WorkflowInputField {
  key: string;
  label: string;
  input: WorkflowInputWidget;
  required?: boolean;
  help?: string | null;
  default?: unknown;
  /**
   * Free-form per-widget constraints. Conventions: `number` inputs read
   * `min`/`max`/`step`; `file` inputs read `accepted_mimes: string[]` (absent or
   * empty = any file; values may use `type/*` wildcards). A `file` input's value
   * at run start is a single opaque `file_id` string, never a list.
   */
  constraints?: Record<string, unknown> | null;
  options?: WorkflowInputOption[] | null;
  source?: Record<string, unknown> | null;
}

/** A pause gate surfaced by a paused run. Mirrors chat's workflow pause widget. */
export interface WorkflowPauseInfo {
  pauseId: string;
  stepId: string;
  prompt: string;
  /** Allowed resume actions (e.g. ["continue", "cancel"]). */
  actions?: string[];
  workflowKey?: string | null;
  workflowName?: string;
}

/** A single deduped image in a step's display-only output. */
export interface PresentedImage {
  url: string;
  mime_type?: string;
}

/**
 * The vocabulary of declared output types, shared by a tool's *declaration* (the
 * registry's `ToolOutput`) and a run's *resolved instance* (`DeclaredOutput`).
 * Owned here because `shared` must not depend on the registry slice.
 */
export type DeclaredOutputType =
  | "string"
  | "number"
  | "boolean"
  | "list"
  | "object"
  | "image";

/**
 * One declared output of a step, resolved for this run - the value a downstream
 * `${outputs.<stepId>.<key>}` actually receives.
 *
 * Split on `type` because an image carries no value of its own: images are
 * referenced, never repeated, so an `image` entry points into the *same
 * payload's* `images` by index and a base64 data URI isn't duplicated on every
 * image step. The indexes are a list because a tool like `draw` declares its
 * image output as one.
 */
export type DeclaredOutput = DeclaredValueOutput | DeclaredImageOutput;

/** A declared output carrying its own resolved value. */
export interface DeclaredValueOutput {
  /** Display text, e.g. "Product Description". */
  label: string;
  type: Exclude<DeclaredOutputType, "image">;
  value?: unknown;
}

/** A declared output whose value is images in the payload's `images`. */
export interface DeclaredImageOutput {
  /** Display text, e.g. "Product Description". */
  label: string;
  type: "image";
  /** Indexes into this payload's `images`. May be empty. */
  image_indexes?: number[];
}

/**
 * The display-only public tool result for a step - exactly what the chat bubble
 * and canvas render, and nothing else.
 */
export interface PresentedStepOutput {
  ok: boolean;
  tool: string;
  text?: string | null;
  /** Deduped images, each `{ url, mime_type }`. */
  images: PresentedImage[];
  error?: string | null;
  /**
   * What each key the step's tool declares resolved to, keyed exactly by the
   * `<key>` in `${outputs.<stepId>.<key>}` - the join between a step's command
   * and the upstream value that fed it.
   *
   * Legitimately absent or empty: the step failed, or its tool declares no
   * outputs (`workflow` and `analyze` do this deliberately). Neither is an error
   * state - `text`/`images` remain the fallback display.
   */
  declared_outputs?: Record<string, DeclaredOutput>;
}

/** A single `workflow.step` live event - one step changed status. */
export interface WorkflowStepEvent {
  runId?: string;
  stepId: string;
  status: Extract<
    StepStatus,
    "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED"
  >;
  /** Output produced by the step (present only on terminal statuses). */
  output?: PresentedStepOutput | unknown;
  /** Error message when the step failed. */
  error?: string;
}

/** An authoritative run snapshot (start / resume / get responses). */
export interface WorkflowRunSnapshot {
  kind?: "workflow.run";
  runId: string;
  workflowKey?: string | null;
  workflowName?: string;
  runStatus: RunStatus;
  /** Per-step statuses known to the backend. Wins over inferred event state. */
  steps: Array<{
    id: string;
    status: StepStatus;
    /** Last error message for the step, from the snapshot's `last_error`. */
    error?: string;
    /** ISO timestamp the step began, from the snapshot's `started_at`. */
    startedAt?: string;
    /** ISO timestamp the step finished, from the snapshot's `completed_at`. */
    completedAt?: string;
    /** How many times the step has been attempted. */
    attempts?: number;
  }>;
  /** Active pause gate, if the run is PAUSED. */
  pause?: WorkflowPauseInfo | null;
  /** Sanitized public tool outputs keyed by step id. */
  outputs?: Record<string, PresentedStepOutput | unknown>;
  /** Run-level error message when FAILED. */
  error?: string;
}

/** Timings the backend reports for a single step. */
export interface StepTiming {
  startedAt?: string;
  completedAt?: string;
  attempts?: number;
}

/** Fields every event in the run log carries, whatever its kind. */
interface RunEventBase {
  /** Monotonic sequence id, stable across renders. */
  id: string;
  /** Client arrival time in epoch ms. */
  ts: number;
  runId?: string;
}

/**
 * One entry in the run's chronological event log.
 *
 * The backend has no dedicated event feed yet, so entries are derived on the
 * client: `step` and `run` from status transitions, `log` from the socket's
 * plain-text `type: "log"` frames. `ts` is therefore arrival time, not backend
 * time. A future backend event frame can be mapped onto these variants without
 * changing consumers.
 *
 * Discriminated on `kind` so each variant states exactly what it carries: a
 * `step` event always names its step, a `run` event never does, and only a `log`
 * line can have had its step *inferred* rather than stated. Consumers narrow on
 * `kind` instead of testing fields for presence.
 */
export type RunEvent =
  | (RunEventBase & {
      kind: "step";
      stepId: string;
      status: StepStatus;
      /** The step's error, when the transition carried one. */
      message?: string;
    })
  | (RunEventBase & {
      kind: "run";
      status: RunStatus;
      /** The run's error, when the transition carried one. */
      message?: string;
    })
  | (RunEventBase & {
      kind: "log";
      message: string;
      /** Set only when the line could be attributed to a step. */
      stepId?: string;
      /** `stepId` was inferred from the running step, not stated by the sender. */
      inferredStep?: boolean;
    });

export interface WorkflowActionPayload {
  runId: string;
  workflowKey?: string;
  action: "continue" | "cancel";
  data?: Record<string, unknown>;
}
