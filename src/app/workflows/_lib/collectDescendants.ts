/**
 * collectDescendants — transitive successors of a node over `depends_on` edges.
 *
 * Edges are authored as `A → B` meaning "B depends_on A" (see `builderGraph`), so
 * data/execution flows from `edge.source` (upstream) to `edge.target`
 * (downstream). The descendants of a node are every node reachable by following
 * edges forward from it.
 *
 * Two uses:
 *  - the output reference picker excludes a node and its descendants (binding to
 *    a descendant's output would create a cycle);
 *  - dangling-reference detection checks a producer is a transitive ancestor of
 *    the referencing node (`referencing ∈ descendants(producer)`).
 *
 * Pure and React-Flow-free so it stays trivially unit-testable. Self is never
 * included unless a genuine cycle leads back to it.
 */

/** Minimal edge shape (a subset of React Flow's `Edge`). */
export interface DependencyEdge {
  source: string;
  target: string;
}

export function collectDescendants(
  nodeId: string,
  edges: ReadonlyArray<DependencyEdge>
): Set<string> {
  // Adjacency: source → [targets…].
  const successors = new Map<string, string[]>();
  for (const edge of edges) {
    const list = successors.get(edge.source) ?? [];
    list.push(edge.target);
    successors.set(edge.source, list);
  }

  const descendants = new Set<string>();
  const stack = [...(successors.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (descendants.has(current)) continue;
    descendants.add(current);
    const next = successors.get(current);
    if (next) stack.push(...next);
  }

  return descendants;
}
