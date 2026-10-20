"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StatusLine } from "@/shared/components/StatusLine/StatusLine";
import { StepNodeHeader } from "@/shared/components/StepNodeHeader/StepNodeHeader";
import { WORKFLOW_INPUT_KIND } from "@/shared/lib/workflow/workflow.types";
import type { WorkflowInputNodeType } from "../../_lib/inputNodes";

/**
 * A declared workflow input, projected onto the builder canvas.
 *
 * Wears the same `StepNodeHeader` as a step so the canvas reads as one
 * vocabulary, with its own icon carrying the difference. What makes it not a
 * step is structural: narrower, with a left accent bar, one source handle and
 * **no target handle** — nothing flows *into* an input, and it must never read
 * as something you can execute or connect into. It carries no delete affordance
 * of its own: removal is the panel's trash button, or the canvas delete key like
 * any other node.
 *
 * Reuses `StatusLine` for the dot-and-caption shape only, bringing its own
 * colours, exactly as `BuilderStepNode` documents. Consumed reads positive;
 * unused is a normal authoring state, so it reads neutral rather than
 * cautionary.
 */
export function WorkflowInputNode({
  data,
  selected,
}: NodeProps<WorkflowInputNodeType>) {
  const { field, usageCount } = data;
  const title = field.label?.trim() || field.key?.trim() || "Untitled input";
  const used = usageCount > 0;

  return (
    <div
      className={[
        // Border width never changes, so selecting cannot nudge the contents.
        "relative w-[180px] cursor-pointer rounded-m border-2 border-l-4 bg-neutral-1 px-75 py-50 shadow-default transition-colors",
        selected
          ? "border-interactive-emphasised-border-selected"
          : "border-neutral-3 border-l-neutral-5",
      ].join(" ")}
    >
      <div className="flex flex-col gap-25">
        <StepNodeHeader stepType={WORKFLOW_INPUT_KIND} label={title} />

        <StatusLine
          dotClassName={
            used ? "bg-semantic-positive" : "border border-neutral-4"
          }
          textClassName={used ? "text-semantic-positive" : "text-text-2"}
        >
          {used
            ? `Used by ${usageCount} field${usageCount > 1 ? "s" : ""}`
            : "Not used"}
        </StatusLine>
      </div>

      {/* Source only — an input is an origin, never a destination. */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!h-2 !w-2 !border-none !bg-neutral-5"
      />
    </div>
  );
}
