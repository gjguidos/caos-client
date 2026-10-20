"use client";

import { StatusLine } from "@/shared/components/StatusLine/StatusLine";
import { StepNodeHeader } from "@/shared/components/StepNodeHeader/StepNodeHeader";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "../../_lib/workflowGraph";
import { formatDuration } from "../../_lib/formatDuration";
import { getNodeStatusMeta } from "../runStatusMeta";

export type WorkflowStepNodeType = Node<WorkflowNodeData, "workflowStep">;

/**
 * Custom React Flow node for a single workflow step: the step's kind icon and
 * name as the heading, then a dot and a word naming its live status and how
 * long it took. Both lines mirror the builder node — same shared header, same
 * dot-and-caption status shape — so the only icon on the node is the step's
 * kind, and a step reads the same whether you are authoring it or watching it.
 */
export function WorkflowStepNode({
  data,
  selected,
}: NodeProps<WorkflowStepNodeType>) {
  const statusMeta = getNodeStatusMeta(data.status);
  const elapsedMs = data.elapsedMs;
  const isRunning = data.status === "RUNNING";

  const duration =
    typeof elapsedMs === "number" ? formatDuration(elapsedMs) : null;

  return (
    <div
      className={[
        // The border is always 2px and only its colour changes, so selecting a
        // node cannot nudge its contents by a pixel.
        "relative w-[220px] overflow-hidden rounded-m border-2 bg-neutral-1 px-75 py-50 shadow-default transition-colors duration-standard-web ease-easy",
        selected
          ? "border-interactive-emphasised-border-selected"
          : "border-neutral-3",
        statusMeta?.dim ? "opacity-60" : "",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-none !bg-neutral-5"
      />

      {/* The in-flight cue: a hairline sweeping the node's top edge. Reads as
          progress at a glance across the whole graph, where a spinning icon
          inside one node does not. */}
      {isRunning && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] overflow-hidden"
        >
          <span className="block h-full w-full animate-step-sweep bg-semantic-informative motion-reduce:animate-none" />
        </span>
      )}

      <div className="flex flex-col gap-25">
        <StepNodeHeader stepType={data.stepType} label={data.label} />

        {/* Status line — a dot and a word, the same shape the builder node uses
            for authoring status, so the only icon on the node is the step's own
            kind. Duration rides along here rather than on its own line, so the
            node stays two lines tall and the graph's layout spacing holds. */}
        {statusMeta && (
          <StatusLine
            dotClassName={statusMeta.dotColor}
            textClassName={`truncate ${statusMeta.color}`}
            pulse={statusMeta.pulse}
          >
            {statusMeta.label}
            {duration && (
              <span className="tabular-nums text-text-3"> · {duration}</span>
            )}
          </StatusLine>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-none !bg-neutral-5"
      />
    </div>
  );
}
