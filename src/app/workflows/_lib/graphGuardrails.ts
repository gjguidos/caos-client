/**
 * graphGuardrails — cheap, pure client-side connection rules for the editable
 * canvas. These back React Flow's `isValidConnection`, blocking the obviously
 * invalid edges inline. Full reachability + tool existence is the backend's job.
 *
 * No React Flow imports — keep these unit-testable on plain `{source,target}`.
 */

export interface GraphEdgeLike {
  source: string;
  target: string;
}

export interface ConnectionLike {
  source: string | null | undefined;
  target: string | null | undefined;
}

/** An edge from a node to itself is never valid. */
export function isSelfLoop(connection: ConnectionLike): boolean {
  return !!connection.source && connection.source === connection.target;
}

/** True if an identical source→target edge already exists. */
export function isDuplicateEdge(
  edges: ReadonlyArray<GraphEdgeLike>,
  connection: ConnectionLike
): boolean {
  return edges.some(
    (e) => e.source === connection.source && e.target === connection.target
  );
}

/**
 * True if adding `source → target` would create a cycle, i.e. `target` can
 * already reach `source` via existing edges. A cycle is never valid in DAG mode,
 * so block rather than flag. Cheap DFS over the existing edge set.
 */
export function wouldCreateCycle(
  edges: ReadonlyArray<GraphEdgeLike>,
  connection: ConnectionLike
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return true;

  // Adjacency: node → nodes it points at.
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  // Can we reach `source` starting from `target`? If so, the new edge closes a loop.
  const stack = [target];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }
  return false;
}

/**
 * The single predicate wired to React Flow's `isValidConnection`: reject
 * self-loops, duplicates, and cycle-creating edges.
 */
export function canConnect(
  edges: ReadonlyArray<GraphEdgeLike>,
  connection: ConnectionLike
): boolean {
  if (!connection.source || !connection.target) return false;
  if (isSelfLoop(connection)) return false;
  if (isDuplicateEdge(edges, connection)) return false;
  if (wouldCreateCycle(edges, connection)) return false;
  return true;
}
