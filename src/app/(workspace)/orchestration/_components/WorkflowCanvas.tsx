"use client";

import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import { layoutWorkflowGraph } from "../_lib/layoutAdapter";
import type {
  StepStatus,
  StepTiming,
  WorkflowDefinition,
} from "@/shared/lib/workflow/workflow.types";
import { useTicker } from "../_hooks/useTicker";
import { stepElapsed } from "../_lib/formatDuration";
import {
  buildWorkflowGraph,
  type WorkflowNodeData,
} from "../_lib/workflowGraph";
import {
  WorkflowStepNode,
  type WorkflowStepNodeType,
} from "./nodes/WorkflowStepNode";

const nodeTypes: NodeTypes = { workflowStep: WorkflowStepNode };

/** Selected node data exposed to the inspector. */
export interface SelectedNodeData {
  id: string;
  label: string;
  data: WorkflowNodeData;
}

interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  /** Live per-step status from the `workflowRun` slice; nodes light up from it. */
  nodeStatus?: Record<string, StepStatus>;
  /** Per-step timings; drive each node's duration read-out. */
  stepTimings?: Record<string, StepTiming>;
  /** The step the inspector is scoped to; the matching node renders selected. */
  selectedStepId?: string | null;
  /** Callback when a node is selected (or selection is cleared). */
  onNodeSelect?: (node: SelectedNodeData | null) => void;
}

/**
 * Read-only workflow graph. Builds nodes/edges from the definition, auto-lays
 * them out left-to-right, and renders them with React Flow. Live run status is
 * injected into each node's data so nodes light up without re-laying-out.
 */
export function WorkflowCanvas({
  definition,
  nodeStatus,
  stepTimings,
  selectedStepId,
  onNodeSelect,
}: Readonly<WorkflowCanvasProps>) {
  // Layout is derived from the (static) definition only — recomputing it on every
  // status tick would be wasteful and jumpy.
  const laidOut = useMemo(() => {
    const graph = buildWorkflowGraph(definition);
    return layoutWorkflowGraph(graph);
  }, [definition]);

  // Tick only while something is in flight, so a settled run costs nothing.
  const hasRunningStep = useMemo(
    () => Object.values(nodeStatus ?? {}).includes("RUNNING"),
    [nodeStatus]
  );
  const now = useTicker(hasRunningStep);

  // `nodes` is a controlled prop and there is no `onNodesChange`, so React Flow's
  // own selection never survives: it emits a select change and, with nothing to
  // apply it, the next render overwrites the store from these props. So selection
  // is not React Flow's to own here — the page already tracks which step the
  // inspector is scoped to, and that is what marks the node selected. It also
  // means selecting a step from the events or outputs list highlights its node,
  // which selection living inside the canvas could never do.
  const nodes = useMemo(
    () =>
      laidOut.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedStepId,
        data: {
          ...node.data,
          // Default un-started steps to PENDING (the snapshot only lists steps
          // the backend has begun tracking; topology comes from the definition).
          status: nodeStatus?.[node.id] ?? "PENDING",
          elapsedMs: stepElapsed(stepTimings?.[node.id], now),
        },
      })),
    [laidOut.nodes, nodeStatus, stepTimings, now, selectedStepId]
  );

  // A DAG shows dependency, not progress. Animating the edges feeding whatever
  // is running now is the only cue on the canvas for where the run actually is.
  const edges = useMemo(
    () =>
      laidOut.edges.map((edge) => {
        const targetStatus = nodeStatus?.[edge.target] ?? "PENDING";
        const sourceStatus = nodeStatus?.[edge.source] ?? "PENDING";
        const isFeedingRunning =
          targetStatus === "RUNNING" && sourceStatus === "COMPLETED";
        return {
          ...edge,
          animated: isFeedingRunning,
          style: {
            stroke: isFeedingRunning
              ? "rgb(var(--colour-semantic-informative))"
              : sourceStatus === "COMPLETED"
                ? "rgb(var(--colour-neutral-5))"
                : "rgb(var(--colour-neutral-4))",
          },
        };
      }),
    [laidOut.edges, nodeStatus]
  );

  // Report the target on a single click; this is what drives selection, since
  // React Flow's own is inert here (see the `nodes` memo).
  const handleNodeClick = useCallback<NodeMouseHandler<Node<WorkflowNodeData>>>(
    (_event, node) => {
      if (!onNodeSelect) return;
      onNodeSelect({
        id: node.id,
        label: node.data.label,
        data: node.data,
      });
    },
    [onNodeSelect]
  );

  // Clicking the empty pane clears the inspector. `onSelectionChange` can't do
  // this job: it reports React Flow's selection, which never fills here.
  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <ReactFlow<WorkflowStepNodeType, Edge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      minZoom={0.5}
      maxZoom={1}
      className="bg-neutral-2"
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
    >
      <Background gap={16} className="!bg-neutral-2" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
