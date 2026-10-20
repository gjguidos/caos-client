/**
 * inputNodes — synthesis of the left-gutter input nodes and their dashed
 * usage edges from the declared `inputs[]`.
 *
 * These are **pure projections**, and they deliberately never enter
 * `useNodesState`/`useEdgesState`: `buildDefinitionFromGraph` turns every node
 * in those arrays into a `WorkflowStep` and every edge into a `depends_on`
 * entry, and `builderSnapshot` (hence the save-status pill) stringifies that
 * same serialization. Keeping the synthesis in separate arrays, merged only at
 * the `<ReactFlow>` props in `BuilderCanvas`, means the serializer, the
 * snapshot, the guardrails and the validators structurally cannot see them —
 * no `type !== "workflowInput"` guard to forget.
 */

import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import type { Edge, Node, NodeChange } from "@xyflow/react";
import type { BuilderStepNodeType } from "../_components/nodes/BuilderStepNode";
import type { InputUsage } from "./inputUsage";

export interface WorkflowInputNodeData {
  /** Declaration index — the node's identity (see `inputNodeId`). */
  index: number;
  field: WorkflowInputField;
  /** Number of consuming fields, for the status line. */
  usageCount: number;
  [key: string]: unknown;
}

export type WorkflowInputNodeType = Node<
  WorkflowInputNodeData,
  "workflowInput"
>;

/**
 * Everything the canvas renders: the real steps plus the synthesized gutter.
 * React Flow types its callbacks for this union, so anything handling its
 * changes speaks it — see `isStepChange` for how the step half is recovered.
 */
export type CanvasNode = BuilderStepNodeType | WorkflowInputNodeType;

/** What React Flow measures a rendered node to be. */
export interface NodeDimensions {
  width: number;
  height: number;
}

export const INPUT_NODE_ID_PREFIX = "input:";
const EDGE_ID_PREFIX = "inputedge:";

/**
 * Gutter column geometry — placement only; the card owns its own styling, so
 * the width here has to track `WorkflowInputNode`'s. Positions are top-left, so
 * the column must be offset by its own width plus the gap, or the cards run
 * into the leftmost step.
 */
const INPUT_NODE_WIDTH = 180;
/** Clear space between the gutter column and the leftmost step. */
const GUTTER_GAP = 100;
const INPUT_NODE_HEIGHT = 76;
const INPUT_NODE_GAP = 24;
/** Where the gutter sits on an otherwise empty canvas. */
const EMPTY_CANVAS_ORIGIN = { x: 0, y: 80 };

/**
 * Node identity is the declaration index, not `field.key`: keying off `key`
 * would break selection mid-rename (every keystroke runs `updateInput`) and
 * collide on duplicate keys. `addInput`/`removeInput` only append and splice —
 * there is no reorder UI — so the index is stable for every mutation that
 * exists. Removing input *i* does shift later ids, so callers must clear the
 * selection on remove.
 */
export function inputNodeId(index: number): string {
  return `${INPUT_NODE_ID_PREFIX}${index}`;
}

/** True for a node id synthesized by this module. */
export function isInputNodeId(id: string): boolean {
  return id.startsWith(INPUT_NODE_ID_PREFIX);
}

/**
 * The declaration index encoded in an input node id, or null for any other id.
 * The inverse of `inputNodeId`, so the id format stays sealed in this module and
 * callers never have to reach into a node's `data` to find out which input it is.
 */
export function inputNodeIndex(id: string): number | null {
  if (!isInputNodeId(id)) return null;
  const index = Number(id.slice(INPUT_NODE_ID_PREFIX.length));
  return Number.isInteger(index) && index >= 0 ? index : null;
}

/**
 * The declared-input indices React Flow is asking to delete, deepest first.
 *
 * Descending, because the ids are declaration indices: removing input *i* shifts
 * every later one down, so a shallower removal applied first would invalidate
 * the indices still queued behind it. Selection is single, so in practice this
 * carries at most one — the order is what keeps that from being load-bearing.
 */
export function removedInputIndexes(
  changes: ReadonlyArray<NodeChange<CanvasNode>>
): number[] {
  const indexes: number[] = [];
  for (const change of changes) {
    if (change.type !== "remove") continue;
    const index = inputNodeIndex(change.id);
    if (index !== null) indexes.push(index);
  }
  return indexes.sort((a, b) => b - a);
}

/**
 * What React Flow just measured for each gutter node, as `[id, dimensions]`.
 *
 * The measurements are the one thing worth salvaging from the gutter changes
 * `isStepChange` drops — see `buildInputNodes`' `measured` parameter for what
 * they are re-seeded into and why. Lives here beside the other two so all three
 * readings of "is this change about a gutter node?" answer to the same rule.
 */
export function inputNodeDimensions(
  changes: ReadonlyArray<NodeChange<CanvasNode>>
): Array<[string, NodeDimensions]> {
  const measured: Array<[string, NodeDimensions]> = [];
  for (const change of changes) {
    if (change.type !== "dimensions" || !change.dimensions) continue;
    if (!isInputNodeId(change.id)) continue;
    measured.push([change.id, change.dimensions]);
  }
  return measured;
}

/**
 * True for a change React Flow raised about a step rather than a gutter node —
 * which is to say, every change the step graph should act on. React Flow reports
 * on everything it renders, but a gutter node's position and connections are
 * derived and it is rebuilt from `inputs[]` on the next render regardless.
 *
 * Two kinds of gutter change are read before this drops them, by the two
 * functions above: a deletion changes `inputs[]` rather than the graph, and a
 * measurement is what the next rebuilt node is seeded with.
 *
 * A guard rather than a cast at the call site: the id *is* what decides, so the
 * narrowing can be stated where that rule lives instead of asserted where it
 * isn't.
 */
export function isStepChange(
  change: NodeChange<CanvasNode>
): change is NodeChange<BuilderStepNodeType> {
  // `add` changes carry an item and no id; they only ever come from us.
  return !("id" in change) || !isInputNodeId(change.id);
}

/** The edge id for one (input, step) pair. */
export function inputEdgeId(index: number, stepId: string): string {
  return `${EDGE_ID_PREFIX}${index}:${stepId}`;
}

/** What the pointer is currently pointing at, for edge emphasis. */
export type CanvasFocus =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

/** The only thing the gutter's placement reads off a step. */
interface StepPosition {
  position: { x: number; y: number };
}

/**
 * Top-left corner of the gutter column, given the current step graph.
 *
 * Both axes take the extreme of the whole graph, never a particular node:
 * anchoring on `stepNodes[0]` would drag the column along with whichever step
 * happens to sit first in the array.
 *
 * Split out from `buildInputNodes` so a caller can depend on the two numbers
 * rather than on the step array: positions change on every frame of a drag, but
 * the origin only moves when the extreme step does. That caller runs this on
 * every render, hence the single pass — `Math.min(...nodes.map(…))` would
 * allocate two throwaway arrays per frame and blow the argument limit on a
 * large graph.
 */
export function gutterOrigin(stepNodes: ReadonlyArray<StepPosition>): {
  x: number;
  y: number;
} {
  if (stepNodes.length === 0) return EMPTY_CANVAS_ORIGIN;

  let minX = Infinity;
  let minY = Infinity;
  for (const { position } of stepNodes) {
    if (position.x < minX) minX = position.x;
    if (position.y < minY) minY = position.y;
  }
  return { x: minX - INPUT_NODE_WIDTH - GUTTER_GAP, y: minY };
}

/**
 * Place the declared inputs in a fixed left gutter, stacked in declaration
 * order. Not fed to dagre: they would distort step ranks with dependencies that
 * are not execution dependencies, and dagre only runs once on edit-load anyway
 * (nodes are dragged freely afterwards), so a "natural" rank decays
 * immediately. Accepted trade-off: a step dragged far left can overlap the
 * gutter.
 *
 * `measured` carries forward what React Flow last measured for each id (see
 * `inputNodeDimensions`). Rebuilding a node replaces its identity, and
 * `adoptUserNodes` then takes `internals.measured` from the incoming object
 * alone — it does not keep what the store had. Arriving without dimensions
 * therefore resets `internals.handleBounds` too (`parseHandles` returns
 * `undefined` for an unmeasured node), and every usage edge anchored to that
 * handle snaps to the node's origin until the resize observer runs again.
 *
 * `initialWidth`/`initialHeight` are the separate, first-render half of this:
 * `nodeHasDimensions` falls back to them, which is what keeps a node that has
 * never been measured from rendering `visibility: hidden`. They cannot stand in
 * for `measured` — only `measured` preserves the handle bounds.
 */
export function buildInputNodes({
  inputs,
  origin,
  usageByKey,
  selectedIndex,
  measured,
}: {
  inputs: ReadonlyArray<WorkflowInputField>;
  origin: { x: number; y: number };
  usageByKey: ReadonlyMap<string, InputUsage[]>;
  selectedIndex: number | null;
  measured?: ReadonlyMap<string, NodeDimensions>;
}): WorkflowInputNodeType[] {
  const { x: originX, y: originY } = origin;

  return inputs.map((field, index) => ({
    id: inputNodeId(index),
    type: "workflowInput" as const,
    position: {
      x: originX,
      y: originY + index * (INPUT_NODE_HEIGHT + INPUT_NODE_GAP),
    },
    data: {
      index,
      field,
      usageCount: usageByKey.get(field.key)?.length ?? 0,
    },
    measured: measured?.get(inputNodeId(index)),
    initialWidth: INPUT_NODE_WIDTH,
    initialHeight: INPUT_NODE_HEIGHT,
    // Position and connections are derived, so neither is editable on the
    // canvas. Deletion is: React Flow's delete key acts on whatever it renders
    // as selected, and `deletable` is the only thing that would exclude an input
    // from that (`getElementsToRemove` skips `deletable: false` outright). The
    // resulting `remove` change is routed to `removeInput` — see
    // `removedInputIndexes`.
    draggable: false,
    connectable: false,
    deletable: true,
    // Selection is ours, not React Flow's — but RF reads this flag to decide
    // what the delete key applies to, which is what makes the above work.
    selected: index === selectedIndex,
  }));
}

/**
 * Resting and emphasised stroke for a usage edge. Always drawn, so the resting
 * stroke has to sit quietly behind the `depends_on` edges it shares the canvas
 * with — dashed and muted. Emphasis stays in the same ink and only firms the
 * line up: the wiring is context, not something to pull the eye off the step
 * you are actually working on.
 */
const EDGE_STYLE_RESTING = {
  strokeDasharray: "4 4",
  stroke: "rgb(var(--colour-neutral-5))",
  strokeWidth: 1,
  strokeOpacity: 0.5,
} as const;

const EDGE_STYLE_EMPHASISED = {
  strokeDasharray: "4 4",
  stroke: "rgb(var(--colour-neutral-5))",
  strokeWidth: 2,
  strokeOpacity: 1,
} as const;

/** The style a usage edge draws with, given whether it is currently emphasised. */
export function inputEdgeStyle(emphasised: boolean) {
  return emphasised ? EDGE_STYLE_EMPHASISED : EDGE_STYLE_RESTING;
}

/**
 * One dashed edge per (input, step) pair — not per field — so three fields of
 * one step consuming the same input don't stack three identical edges. The
 * Used-by list stays per field.
 */
export function buildInputEdges(
  usages: ReadonlyArray<InputUsage>,
  inputs: ReadonlyArray<WorkflowInputField>
): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();

  inputs.forEach((field, index) => {
    for (const usage of usages) {
      if (usage.inputKey !== field.key) continue;
      const id = inputEdgeId(index, usage.stepId);
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({
        id,
        source: inputNodeId(index),
        target: usage.stepId,
        data: { inputIndex: index, stepId: usage.stepId },
        style: inputEdgeStyle(false),
        animated: false,
        selectable: false,
        deletable: false,
      });
    }
  });

  return edges;
}

/**
 * Which edge ids the current focus emphasises. Every usage edge is drawn — the
 * wiring between an input and the steps consuming it is what the gutter is for,
 * so it should not have to be discovered by hovering. Focus and selection only
 * change how loudly an edge is drawn, via `inputEdgeStyle`.
 *
 * `selectedNodeId` is whichever canvas node the selection resolves to — a step's
 * own id, or `inputNodeId(index)` for a selected input. Both ends of an edge are
 * checked, so one parameter covers what the selection can point at.
 */
export function emphasizedInputEdgeIds(
  edges: ReadonlyArray<Edge>,
  focus: CanvasFocus | null,
  selectedNodeId: string | null
): Set<string> {
  const emphasised = new Set<string>();
  const focusedNodeId = focus?.kind === "node" ? focus.id : null;
  const focusedEdgeId = focus?.kind === "edge" ? focus.id : null;

  for (const edge of edges) {
    const touches = (id: string | null) =>
      id !== null && (edge.source === id || edge.target === id);
    if (
      touches(focusedNodeId) ||
      touches(selectedNodeId) ||
      edge.id === focusedEdgeId
    ) {
      emphasised.add(edge.id);
    }
  }

  return emphasised;
}
