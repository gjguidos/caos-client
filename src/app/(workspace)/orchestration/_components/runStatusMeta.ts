
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MinusCircle,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type {
  RunStatus,
  StepStatus,
} from "@/shared/lib/workflow/workflow.types";

/**
 * Presentation metadata for overall workflow run status.
 *
 * Mirrors node status metadata so the run badge,
 * workflow canvas, and event timeline stay consistent.
 */
export interface RunStatusMeta {
  label: string;
  /** Tailwind classes for the status badge. */
  className: string;
}

const RUN_STATUS_META: Record<RunStatus, RunStatusMeta> = {
  RUNNING: {
    label: "Running",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  PAUSED: {
    label: "Paused",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  FAILED: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

/**
 * Status badge for the overall run.
 *
 * isStarting provides a pending state before
 * the first execution status arrives.
 */
export function getRunStatusMeta(
  runStatus: RunStatus | null,
  isStarting = false
): RunStatusMeta | null {
  if (runStatus) {
    return RUN_STATUS_META[runStatus];
  }

  if (isStarting) {
    return {
      label: "Starting…",
      className: "bg-muted text-muted-foreground",
    };
  }

  return null;
}

/**
 * Presentation metadata for individual workflow steps.
 *
 * Status is expressed using:
 * - A Lucide icon and text label
 * - A colored status dot on canvas nodes
 *
 * The step-type accent border remains independent
 * of execution status.
 */
export interface NodeStatusMeta {
  /** Human-readable status label. */
  label: string;

  /** Lucide icon component. */
  icon: LucideIcon;

  /** Tailwind color for icon and label. */
  color: string;

  /** Tailwind background color for canvas status dot. */
  dotColor: string;

  /** Pulse the dot while the step is running. */
  pulse: boolean;

  /** Dim skipped and cancelled nodes. */
  dim: boolean;
}

const NODE_STATUS_META: Record<StepStatus, NodeStatusMeta> = {
  PENDING: {
    label: "Pending",
    icon: Clock3,
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    pulse: false,
    dim: false,
  },

  RUNNING: {
    label: "Running",
    icon: LoaderCircle,
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
    pulse: true,
    dim: false,
  },

  PAUSED: {
    label: "Paused",
    icon: PauseCircle,
    color: "text-amber-700 dark:text-amber-400",
    dotColor: "bg-amber-500",
    pulse: false,
    dim: false,
  },

  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-700 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    pulse: false,
    dim: false,
  },

  FAILED: {
    label: "Failed",
    icon: XCircle,
    color: "text-destructive",
    dotColor: "bg-destructive",
    pulse: false,
    dim: false,
  },

  SKIPPED: {
    label: "Skipped",
    icon: MinusCircle,
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    pulse: false,
    dim: true,
  },

  CANCELLED: {
    label: "Cancelled",
    icon: MinusCircle,
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    pulse: false,
    dim: true,
  },
};

export function getNodeStatusMeta(
  status: StepStatus | undefined
): NodeStatusMeta | null {
  return status ? NODE_STATUS_META[status] : null;
}
