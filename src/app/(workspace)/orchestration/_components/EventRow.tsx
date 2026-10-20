
"use client";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CirclePause,
  CircleX,
  Clock3,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import type { RunEvent } from "@/shared/lib/workflow/workflow.types";

import { formatEventTime } from "../_lib/formatDuration";
import { statusOf, stepIdOf } from "@/shared/lib/workflow/runEvents";
import { getNodeStatusMeta } from "./runStatusMeta";

export interface EventRowProps {
  event: RunEvent;
  /** Label for the step the event belongs to, when it maps to a known step. */
  stepLabel?: string;
  onSelectStep?: (stepId: string) => void;
}

/**
 * Temporary status-to-icon adapter.
 *
 * Once runStatusMeta uses LucideIcon directly, this
 * function can be removed.
 */
function getStatusIcon(status: string): LucideIcon {
  switch (status.toLowerCase()) {
    case "success":
    case "succeeded":
    case "completed":
    case "complete":
      return CheckCircle2;

    case "failed":
    case "failure":
    case "error":
    case "cancelled":
    case "canceled":
      return CircleX;

    case "running":
    case "in_progress":
    case "executing":
      return Loader2;

    case "pending":
    case "queued":
    case "waiting":
      return Clock3;

    case "paused":
    case "suspended":
      return CirclePause;

    case "warning":
      return AlertCircle;

    default:
      return Circle;
  }
}

/**
 * One entry in the workflow run chronology:
 * timestamp, step, status, and message.
 *
 * Fixed-width metadata stays visible while long
 * event messages truncate.
 */
export function EventRow({
  event,
  stepLabel,
  onSelectStep,
}: Readonly<EventRowProps>) {
  const stepId = stepIdOf(event);
  const status = statusOf(event);

  const inferredStep =
    event.kind === "log" && event.inferredStep;

  const statusMeta = getNodeStatusMeta(status);

  const StatusIcon = status
    ? getStatusIcon(status)
    : Circle;

  return (
    <li
      data-testid={`event-row-${event.id}`}
      title={event.message}
      className="flex items-baseline gap-4 whitespace-nowrap px-4 py-1 text-xs"
    >
      <time
        dateTime={new Date(event.ts).toISOString()}
        className="shrink-0 font-mono tabular-nums text-muted-foreground"
      >
        {formatEventTime(event.ts)}
      </time>

      {stepId && onSelectStep ? (
        <button
          type="button"
          onClick={() => onSelectStep(stepId)}
          title={
            inferredStep
              ? `${stepLabel ?? stepId} (inferred from the running step)`
              : (stepLabel ?? stepId)
          }
          className={[
            "max-w-[8rem] shrink-0 truncate text-left",
            "underline-offset-2 hover:underline",
            "focus-visible:rounded-sm focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            inferredStep
              ? "text-muted-foreground"
              : "text-foreground",
          ].join(" ")}
        >
          {stepLabel ?? stepId}
          {inferredStep && "*"}
        </button>
      ) : (
        <span className="shrink-0 text-muted-foreground">
          {event.kind === "run" ? "run" : "—"}
        </span>
      )}

      {statusMeta && (
        <span
          className={`inline-flex shrink-0 items-center gap-1 ${statusMeta.color}`}
        >
          <StatusIcon
            className={[
              "size-3 shrink-0",
              ["running", "in_progress", "executing"].includes(
                String(status).toLowerCase()
              )
                ? "animate-spin"
                : "",
            ].join(" ")}
            aria-hidden="true"
          />

          <span>{status}</span>
        </span>
      )}

      {event.message && (
        <span className="min-w-0 flex-1 truncate text-foreground/80">
          {event.message}
        </span>
      )}
    </li>
  );
}
