/**
 * layoutAdapter — one-shot, left-to-right auto-layout for the workflow graph.
 *
 * Kept behind a tiny adapter (`LayoutEngine`) so the engine (dagre today, elkjs
 * later) can be swapped without touching the canvas or the pure graph builder.
 * Positions are not persisted — they are recomputed from the topology each render.
 */

import dagre from "@dagrejs/dagre";
import type { WorkflowGraph, WorkflowGraphNode } from "./workflowGraph";

/** Default node footprint used for layout spacing (matches the node component). */
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 84;

export interface LayoutOptions {
  /** Layout direction. "LR" = left-to-right (default). */
  direction?: "LR" | "TB";
  nodeWidth?: number;
  nodeHeight?: number;
  /** Gap between nodes in the same rank. */
  nodeSep?: number;
  /** Gap between ranks. */
  rankSep?: number;
}

export interface LayoutEngine {
  layout: (graph: WorkflowGraph, options?: LayoutOptions) => WorkflowGraph;
}

/** dagre-backed engine. */
export const dagreLayoutEngine: LayoutEngine = {
  layout(graph, options = {}) {
    const {
      direction = "LR",
      nodeWidth = NODE_WIDTH,
      nodeHeight = NODE_HEIGHT,
      nodeSep = 48,
      rankSep = 96,
    } = options;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: direction, nodesep: nodeSep, ranksep: rankSep });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of graph.nodes) {
      g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    }
    for (const edge of graph.edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const nodes: WorkflowGraphNode[] = graph.nodes.map((node) => {
      const { x, y } = g.node(node.id);
      // dagre returns center coordinates; React Flow expects top-left.
      return {
        ...node,
        position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 },
      };
    });

    return { nodes, edges: graph.edges };
  },
};

/** Convenience: lay out a graph with the default (dagre) engine. */
export function layoutWorkflowGraph(
  graph: WorkflowGraph,
  options?: LayoutOptions
): WorkflowGraph {
  return dagreLayoutEngine.layout(graph, options);
}
