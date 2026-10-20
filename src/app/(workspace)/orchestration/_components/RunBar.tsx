
"use client";

import { Button } from "@/components/ui/button";

import {
  TERMINAL_RUN_STATUSES,
  type RunStatus,
} from "@/shared/lib/workflow/workflow.types";

import type { AttachedWorkflow } from "@/shared/lib/workflow/attachedWorkflows";

import { useTicker } from "../_hooks/useTicker";
import { formatDuration } from "../_lib/formatDuration";
import { getRunStatusMeta } from "./runStatusMeta";
import { WorkflowPicker } from "./WorkflowPicker";

export interface RunBarProps {
  agentName: string;

  /** The agent's attached workflows, resolved against the catalog. */
  workflows: AttachedWorkflow[];

  workflowKey?: string | null;
  onWorkflowChange: (key: string) => void;

  runStatus: RunStatus | null;
  isStarting: boolean;

  /** Epoch milliseconds when the current run began. */
  startedAt: number | null;

  onCancel: () => void;
  onRunAgain: () => void;
}

/**
 * The run's identity and lifecycle controls.
 *
 * Keeps workflow selection, execution status, elapsed time,
 * cancellation, and rerun actions together.
 */
export function RunBar({
  agentName,
  workflows,
  workflowKey,
  onWorkflowChange,
  runStatus,
  isStarting,
  startedAt,
  onCancel,
  onRunAgain,
}: Readonly<RunBarProps>) {
  const statusMeta = getRunStatusMeta(runStatus, isStarting);

  const isActive =
    isStarting ||
    runStatus === "RUNNING" ||
    runStatus === "PAUSED";

  const isTerminal =
    !!runStatus && TERMINAL_RUN_STATUSES.has(runStatus);

  const now = useTicker(isActive);

  const elapsed =
    startedAt === null
      ? null
      : Math.max(0, now - startedAt);

  // Prevent switching workflows while a run is active.
  const pickerLocked =
    runStatus === "RUNNING" ||
    runStatus === "PAUSED";

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
      <WorkflowPicker
        agentName={agentName}
        workflows={workflows}
        workflowKey={workflowKey}
        onWorkflowChange={onWorkflowChange}
        locked={pickerLocked}
      />

      <div className="flex shrink-0 items-center gap-3">
        {elapsed !== null && (
          <span
            className="font-mono text-xs tabular-nums text-muted-foreground"
            aria-label="Run duration"
          >
            {formatDuration(elapsed)}
          </span>
        )}

        {statusMeta && (
          <span
            className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
            role="status"
          >
            {statusMeta.label}
          </span>
        )}

        {isActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel run
          </Button>
        )}

        {isTerminal && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onRunAgain}
          >
            Run again
          </Button>
        )}
      </div>
    </div>
  );
}
