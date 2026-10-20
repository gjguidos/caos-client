/**
 * Pure logic for the workflow keys attached to an agent (`Agent.workflows`).
 *
 * An attached key is a claim about the catalog, not a guarantee: a workflow can
 * be deleted while agents still reference it. Deciding that a key is stale is
 * only possible once the catalog has actually loaded, so `WorkflowCatalog`
 * keeps "not loaded yet" and "could not load" distinct from "loaded and empty".
 * Without that distinction a failed catalog fetch reads as "every attached
 * workflow was deleted".
 */

/** A catalog row, narrowed to what attachment resolution needs. */
export interface WorkflowCatalogEntry {
  key: string;
  name?: string | null;
  description?: string | null;
}

/** The catalog as far as the client knows it. */
export type WorkflowCatalog<
  E extends WorkflowCatalogEntry = WorkflowCatalogEntry,
> =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; entries: readonly E[] };

/** An attached key resolved against the catalog. */
export interface AttachedWorkflow {
  key: string;
  /** Catalog display name, falling back to the key when unresolved. */
  name: string;
  /** Catalog description, or null when unresolved or the workflow has none. */
  description: string | null;
  /**
   * True only when the catalog loaded and does not hold this key. Never true
   * while the catalog is `loading` or `unavailable` — we cannot tell a deleted
   * workflow from one we simply failed to look up.
   */
  stale: boolean;
}

/**
 * How a workflow is named in the UI. The key is an identifier the user never
 * types, so it only surfaces when the catalog has nothing better - which also
 * covers a catalog row whose name is empty, not just a missing row.
 */
export function workflowLabel(entry: WorkflowCatalogEntry): string {
  return entry.name || entry.key;
}

/**
 * Resolve attached keys against the catalog, preserving the agent's order.
 * Keys with no catalog entry are kept and marked `stale` — dropping them would
 * silently detach a workflow the agent still declares.
 */
export function resolveAttachedWorkflows(
  keys: readonly string[],
  catalog: WorkflowCatalog
): AttachedWorkflow[] {
  if (catalog.status !== "ready") {
    return keys.map((key) => ({
      key,
      name: key,
      description: null,
      stale: false,
    }));
  }

  const byKey = new Map(catalog.entries.map((entry) => [entry.key, entry]));
  return keys.map((key) => {
    const entry = byKey.get(key);
    return {
      key,
      name: entry ? workflowLabel(entry) : key,
      description: entry?.description ?? null,
      stale: entry === undefined,
    };
  });
}
