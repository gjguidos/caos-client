"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { findByKey } from "@/store/slices/registry/registryEntry";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import {
  buildInputEdges,
  buildInputNodes,
  gutterOrigin,
  inputEdgeStyle,
  inputNodeId,
  inputNodeIndex,
  emphasizedInputEdgeIds,
  type CanvasFocus,
  type NodeDimensions,
  type WorkflowInputNodeType,
} from "../_lib/inputNodes";
import {
  collectInputUsage,
  groupUsageByInputKey,
  type InputUsage,
  type UsageScanNode,
} from "../_lib/inputUsage";
import type { BuilderStepNodeType } from "../_components/nodes/BuilderStepNode";
import type {
  BuilderSelection,
  UseBuilderSelection,
} from "./useBuilderSelection";

/**
 * A fresh, blank input. The default key is the first `input_<n>` no existing
 * input has taken, so declaring after a remove cannot mint a duplicate: two
 * inputs sharing a key report each other's usages and both count them.
 */
function makeBlankInput(
  existing: ReadonlyArray<WorkflowInputField>
): WorkflowInputField {
  const taken = new Set(existing.map((field) => field.key));
  let n = existing.length + 1;
  while (taken.has(`input_${n}`)) n += 1;
  return { key: `input_${n}`, label: "", input: "text" };
}

/**
 * Rename the measurement cache to match the ids after removing `removedIndex`.
 *
 * The cache is keyed by node id and an id is a declaration index, so a removal
 * renames every later node. Left alone, the node that moves up into an id would
 * be seeded with the previous occupant's size, and the entry for the last id
 * would outlive its node — the next `declareInput` takes that index back and
 * would inherit a size that was never its own.
 */
function shiftMeasured(
  measured: ReadonlyMap<string, NodeDimensions>,
  removedIndex: number
): Map<string, NodeDimensions> {
  const shifted = new Map<string, NodeDimensions>();
  for (const [id, dimensions] of measured) {
    const index = inputNodeIndex(id);
    if (index === null || index === removedIndex) continue;
    shifted.set(index > removedIndex ? inputNodeId(index - 1) : id, dimensions);
  }
  return shifted;
}

export interface UseWorkflowInputsArgs {
  /** Author-declared, workflow-global runtime inputs, and their setter. */
  inputs: WorkflowInputField[];
  setInputs: Dispatch<SetStateAction<WorkflowInputField[]>>;
  /** The live step graph — the usage scan's input and the gutter's anchor. */
  nodes: BuilderStepNodeType[];
  tools: ReadonlyArray<ToolDefinition>;
  /** The resolved canvas selection, for marking the selected gutter card. */
  selection: BuilderSelection | null;
  /** Selection writes this hook initiates: declare selects, remove clears. */
  selectInput: UseBuilderSelection["selectInput"];
}

export interface UseWorkflowInputs {
  /**
   * Declare a fresh input and select it: the canvas node and its panel are the
   * only way to configure one, so landing on an empty panel would be a dead end.
   */
  declareInput: () => void;
  /** Remove the input at `index`. */
  removeInput: (index: number) => void;
  /** Merge a partial patch into the input at `index`. */
  updateInput: (index: number, patch: Partial<WorkflowInputField>) => void;
  /**
   * Input nodes and their usage edges — pure projections of `inputs[]`, kept out
   * of `nodes`/`edges` so the serializer, the dirty snapshot and the graph
   * guardrails structurally cannot see them. Merged only at the `<ReactFlow>`
   * props in `BuilderCanvas`.
   */
  inputNodes: WorkflowInputNodeType[];
  inputEdges: Edge[];
  /** Every `${inputs.<key>}` consumption in the graph, grouped by input key. */
  usageByKey: ReadonlyMap<string, InputUsage[]>;
  /** What the pointer is pointing at, driving usage-edge emphasis. */
  setCanvasFocus: (focus: CanvasFocus | null) => void;
  /**
   * Record what React Flow measured for the gutter nodes, as
   * `inputNodeDimensions` extracts it. A gutter node is rebuilt from `inputs[]`
   * rather than stored, so its `dimensions` change is dropped with the rest and
   * this is the only place a measurement survives — see `buildInputNodes` for
   * what it is re-seeded into and why.
   */
  noteInputDimensions: (
    measured: ReadonlyArray<[string, NodeDimensions]>
  ) => void;
}

/**
 * `nodes` is re-identified on every frame of a drag, and neither projection
 * below cares: what a step consumes is its `data`, and where the gutter sits is
 * the extreme position in the graph. So each depends on the part it actually
 * reads rather than on the array — this hook for the scan, and two plain
 * numbers off `gutterOrigin` for the column.
 *
 * The projection is narrowed to `UsageScanNode` on the way through, so the one
 * field that does churn per frame is not merely ignored here but unreachable
 * from the returned value.
 */
function useUsageScanNodes(
  nodes: ReadonlyArray<BuilderStepNodeType>
): UsageScanNode[] {
  const stable = useRef<UsageScanNode[]>([]);
  const unchanged =
    stable.current.length === nodes.length &&
    nodes.every(
      (node, i) =>
        stable.current[i].id === node.id && stable.current[i].data === node.data
    );
  if (!unchanged) stable.current = nodes.map(({ id, data }) => ({ id, data }));
  return stable.current;
}

/**
 * The declared-inputs half of the builder: mutations on `inputs[]` and their
 * projection onto the canvas (gutter nodes + dashed usage edges).
 *
 * Reads the selection but never writes the graph — `useBuilderSelection` owns
 * both halves of that — so nothing here can put step selection and input
 * selection out of step.
 */
export function useWorkflowInputs({
  inputs,
  setInputs,
  nodes,
  tools,
  selection,
  selectInput,
}: UseWorkflowInputsArgs): UseWorkflowInputs {
  const [canvasFocus, setCanvasFocus] = useState<CanvasFocus | null>(null);

  // The declared inputs including appends not yet committed. `declareInput` has
  // to name the index it just took, and state is not readable until the next
  // render — so two declares in one batch (keydown repeat, a double click) would
  // both read the same length and the second would select the first's input.
  // Advancing this eagerly is what keeps each declare naming its own index; the
  // effect resyncs it to whatever actually landed, including external writes
  // such as an edit-mode load.
  const inputsRef = useRef(inputs);
  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  const declareInput = useCallback(() => {
    const existing = inputsRef.current;
    // Minted once, from the pending list, so a second declare in the same batch
    // sees this one as taken and cannot reuse its key.
    const field = makeBlankInput(existing);
    inputsRef.current = [...existing, field];
    setInputs((prev) => [...prev, field]);
    selectInput(existing.length);
  }, [setInputs, selectInput]);

  const measuredRef = useRef(new Map<string, NodeDimensions>());
  const noteInputDimensions = useCallback<
    UseWorkflowInputs["noteInputDimensions"]
  >((measured) => {
    for (const [id, dimensions] of measured)
      measuredRef.current.set(id, dimensions);
  }, []);

  const removeInput = useCallback(
    (index: number) => {
      setInputs((prev) => prev.filter((_, i) => i !== index));
      // Node ids are declaration indices, so removing one shifts every later id.
      // Clearing unconditionally is the only selection that stays correct.
      selectInput(null);
      measuredRef.current = shiftMeasured(measuredRef.current, index);
    },
    [setInputs, selectInput]
  );

  const updateInput = useCallback<UseWorkflowInputs["updateInput"]>(
    (index, patch) => {
      setInputs((prev) =>
        prev.map((field, i) => (i === index ? { ...field, ...patch } : field))
      );
    },
    [setInputs]
  );

  // ---- Projections of `inputs[]` (never in `nodes`/`edges`) ----
  const scanNodes = useUsageScanNodes(nodes);
  const usages = useMemo(
    () =>
      collectInputUsage(
        scanNodes,
        (toolName) => findByKey(tools, toolName) ?? undefined
      ),
    [scanNodes, tools]
  );
  const usageByKey = useMemo(() => groupUsageByInputKey(usages), [usages]);

  // A drag rewrites a node object — and with it the selection that points at one
  // — on every pointer move, while saying nothing about where the gutter belongs
  // or what a step consumes. So the projections below depend on scalars rather
  // than on the objects those are read off: the origin's two numbers, the
  // selected index, the selected node id. Depending on the objects would rebuild
  // every gutter node per frame, and a rebuilt node loses its handle bounds
  // (see `buildInputNodes`), which is what made the usage edges snap.
  const { x: originX, y: originY } = gutterOrigin(nodes);
  const selectedInputIndex =
    selection?.kind === "input" ? selection.index : null;
  const selectedNodeId = selectedCanvasNodeId(selection);

  // A ref, so a fresh measurement deliberately does not rebuild the gutter: it
  // is a seed for the *next* rebuild, not a reason for one. Nothing goes stale
  // by it — a card only changes size when its content does, and that content is
  // `inputs`/`usageByKey`, which are dependencies here.
  const inputNodes = useMemo(
    () =>
      buildInputNodes({
        inputs,
        origin: { x: originX, y: originY },
        usageByKey,
        selectedIndex: selectedInputIndex,
        measured: measuredRef.current,
      }),
    [inputs, originX, originY, usageByKey, selectedInputIndex]
  );

  const inputEdges = useMemo(() => {
    const built = buildInputEdges(usages, inputs);
    const emphasised = emphasizedInputEdgeIds(
      built,
      canvasFocus,
      selectedNodeId
    );
    // Every edge stays on the canvas; focus only restyles it, so React Flow
    // never remounts an edge on hover.
    return built.map((edge) => ({
      ...edge,
      style: inputEdgeStyle(emphasised.has(edge.id)),
    }));
  }, [usages, inputs, canvasFocus, selectedNodeId]);

  return {
    declareInput,
    removeInput,
    updateInput,
    inputNodes,
    inputEdges,
    usageByKey,
    setCanvasFocus,
    noteInputDimensions,
  };
}

/** The canvas node a selection points at, for usage-edge emphasis. */
function selectedCanvasNodeId(
  selection: BuilderSelection | null
): string | null {
  if (!selection) return null;
  return selection.kind === "step"
    ? selection.node.id
    : inputNodeId(selection.index);
}
