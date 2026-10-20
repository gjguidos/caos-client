import type { WorkflowActionPayload } from "./workflow.types";

/** Resume payload fields beyond the base chat action. */
export interface ResumePayload extends WorkflowActionPayload {
  /** Paused step id; the backend infers it when omitted. */
  stepId?: string;
  /** Pause id of the active pause gate. */
  pauseId?: string;
}

/**
 * Start a new run of `workflowKey` with the given declared inputs.
 *
 * The key is the catalog `key` (a plain slug), sent verbatim — only `--inputs`
 * carries URL-encoded JSON. The backend has no default workflow to fall back
 * to, so a start without a key is rejected.
 */
export function encodeStart(
  workflowKey: string,
  inputs: Record<string, unknown>
): string {
  const encoded = encodeURIComponent(JSON.stringify(inputs));
  return `@workflow --op=start --workflow_key=${workflowKey} --inputs=${encoded}`;
}

/**
 * Resume (continue / cancel) a paused run.
 *
 * `workflowKey` is the one place it stays optional: the chat client resumes
 * from a parsed pause frame, which does not always carry the key.
 */
export function encodeResume({
  runId,
  workflowKey,
  action,
  stepId,
  pauseId,
  data = {},
}: ResumePayload): string {
  const pausePayload = encodeURIComponent(
    JSON.stringify({
      action,
      ...(stepId ? { step_id: stepId } : {}),
      ...(pauseId ? { pause_id: pauseId } : {}),
      data,
    })
  );
  const wfKey = workflowKey ? ` --workflow_key=${workflowKey}` : "";
  return `@workflow --op=resume --run_id=${runId}${wfKey} --pause_payload=${pausePayload}`;
}

/** Fetch an authoritative snapshot for an existing run (reattach / re-sync). */
export function encodeGet(runId: string): string {
  return `@workflow --op=get --run_id=${runId}`;
}

/** Cancel a running (not necessarily paused) run. */
export function encodeCancel(runId: string, workflowKey: string): string {
  return `@workflow --op=cancel --run_id=${runId} --workflow_key=${workflowKey}`;
}
