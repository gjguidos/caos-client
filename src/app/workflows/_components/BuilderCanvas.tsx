
"use client";

import {
  Background,
  Controls,
  ReactFlow,
  useReactFlow,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type NodeTypes,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { useCallback, useRef } from "react";
import type { DragEvent } from "react";

import {
  BuilderStepNode,
  type BuilderStepNodeType,
} from "./nodes/BuilderStepNode";

import {
  decodePaletteKind,
  PALETTE_DND_TYPE,
  type PaletteKind,
} from "../_lib/stepKinds";

const nodeTypes: NodeTypes = {
  builderStep: BuilderStepNode,
};

interface BuilderCanvasProps {
  nodes: BuilderStepNodeType[];
  edges: Edge[];
  onNodesChange: OnNodesChange<BuilderStepNodeType>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: OnConnect;
  isValidConnection: IsValidConnection<Edge>;

  /** Add a palette node at a flow-space position. */
  onAddNode: (
    kind: PaletteKind,
    position: { x: number; y: number }
  ) => void;
}

/**
 * Editable React Flow canvas.
 *
 * Supports:
 * - Node dragging and deletion
 * - Edge connections and reconnection
 * - Palette drag-and-drop
 * - Screen-to-flow coordinate conversion
 *
 * Distinct from the read-only WorkflowCanvas
 * used for monitoring workflow execution.
 */
export function BuilderCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  isValidConnection,
  onAddNode,
}: Readonly<BuilderCanvasProps>) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const kind = decodePaletteKind(
        event.dataTransfer.getData(PALETTE_DND_TYPE)
      );

      if (!kind) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onAddNode(kind, position);
    },
    [screenToFlowPosition, onAddNode]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      data-testid="builder-canvas"
    >
      <ReactFlow<BuilderStepNodeType, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onDrop={onDrop}
        onDragOver={onDragOver}
        deleteKeyCode={["Delete", "Backspace"]}
        edgesReconnectable
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.5}
        className="bg-muted/40"
      >
        <Background
          gap={16}
          className="!bg-muted/40"
        />

        <Controls showInteractive={false} />
      </ReactFlow>

      {/* Non-interactive overlay so drops reach the canvas. */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-lg font-semibold text-foreground">
            Start building your workflow
          </p>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Drag a tool or step from the left, or click one
            to add it.
          </p>
        </div>
      )}
    </div>
  );
}
