/**
 * Remembers which of an agent's attached workflows the workspace was last
 * pointed at, so a reload lands back on the same one. Keyed by agent id.
 */

import { scopedStorage } from "./scopedStorage";

const storage = scopedStorage("orchestration:activeWorkflow");

/** Persist the active workflow key for the given agent. */
export function saveActiveWorkflowKey(
  agentId: string,
  workflowKey: string
): void {
  storage.save([agentId], workflowKey);
}

/** Return the persisted workflow key for the given agent, or null if none. */
export function loadActiveWorkflowKey(agentId: string): string | null {
  return storage.load([agentId]);
}
