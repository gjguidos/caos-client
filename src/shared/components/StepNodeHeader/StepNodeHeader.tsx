
import {
  ArrowRightToLine,
  ListFilter,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import type { NodeKind } from "@/shared/lib/workflow/workflow.types";
import { WORKFLOW_INPUT_KIND } from "@/shared/lib/workflow/workflow.types";

/**
 * Shared icon and accessible name for every workflow node kind.
 *
 * Keep this mapping exhaustive so new node kinds must be
 * explicitly added rather than silently inheriting an icon.
 */
const NODE_KIND: Record<
  NodeKind,
  { icon: LucideIcon; name: string }
> = {
  tool: {
    icon: Wrench,
    name: "Tool",
  },
  pause: {
    icon: ListFilter,
    name: "Pause",
  },
  set: {
    icon: ListFilter,
    name: "Set",
  },
  wait_event: {
    icon: ListFilter,
    name: "Wait event",
  },
  end: {
    icon: ListFilter,
    name: "End",
  },
  [WORKFLOW_INPUT_KIND]: {
    icon: ArrowRightToLine,
    name: "Workflow input",
  },
};

interface StepNodeHeaderProps {
  stepType: NodeKind;

  /** The step's name, displayed as the node heading. */
  label: string;

  className?: string;
}

/**
 * Shared header for builder and execution nodes.
 *
 * Displays the node-kind icon and the step label
 * consistently across workflow authoring and execution.
 */
export function StepNodeHeader({
  stepType,
  label,
  className,
}: Readonly<StepNodeHeaderProps>) {
  const { icon: Icon, name } = NODE_KIND[stepType];

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        className
      )}
    >
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />

      <span className="sr-only">{name}</span>

      <p
        className="min-w-0 truncate text-sm font-medium text-foreground"
        title={label}
      >
        {label}
      </p>
    </div>
  );
}
