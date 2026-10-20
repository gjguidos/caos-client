/**
 * Persistence for the active workflow run id, scoped to one agent + workflow:
 * an agent may have several workflows attached, and a reattach must never
 * restore a run belonging to a different one.
 */

import { scopedStorage } from "./scopedStorage";

const storage = scopedStorage("orchestration:runId");

/** Read/write access to the run id of one agent + workflow pair. */
export interface RunIdStore {
  load(): string | null;
  save(runId: string): void;
  clear(): void;
}

/**
 * Bind a run-id store to an agent + workflow.
 *
 * `workflowKey` is nullable because no workflow is selected until the agent
 * loads. That case yields an inert store rather than forcing every call site to
 * null-check, which matches the invariant that no run can exist without a
 * selected workflow.
 */
export function runIdStore(
  agentId: string,
  workflowKey: string | null | undefined
): RunIdStore {
  if (!workflowKey) {
    return { load: () => null, save: () => {}, clear: () => {} };
  }

  const scope = [agentId, workflowKey];
  return {
    load: () => storage.load(scope),
    save: (runId) => storage.save(scope, runId),
    clear: () => storage.clear(scope),
  };
}
