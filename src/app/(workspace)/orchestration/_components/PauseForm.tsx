
"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import type { WorkflowPauseInfo } from "@/shared/lib/workflow/workflow.types";

/** Payload handed to the parent to resume a paused run. */
export interface PauseContinuePayload {
  action: "continue";
  data: Record<string, unknown>;
}

/** An active pause gate together with everything needed to answer it. */
export interface PauseGate {
  info: WorkflowPauseInfo;
  isResuming: boolean;
  isConnected: boolean;
  onContinue: (payload: PauseContinuePayload) => void;
  onCancel: () => void;
}

export interface PauseFormProps {
  /** The active pause gate (prompt to review before continuing). */
  pause: WorkflowPauseInfo;
  /** A resume command is in flight; controls disable the buttons. */
  isResuming?: boolean;
  /** WebSocket connected; controls are disabled while offline. */
  isConnected?: boolean;
  /** Continue the run. */
  onContinue: (payload: PauseContinuePayload) => void;
  /** Cancel the paused run. */
  onCancel: () => void;
}

/**
 * Human-in-the-loop pause gate.
 *
 * Displays the pause prompt and provides continue/cancel actions.
 * The run lifecycle remains managed by the parent and workflowRun slice.
 */
export function PauseForm({
  pause,
  isResuming = false,
  isConnected = true,
  onContinue,
  onCancel,
}: PauseFormProps) {
  const busy = isResuming || !isConnected;

  const handleContinue = useCallback(() => {
    onContinue({
      action: "continue",
      data: {
        pause_id: pause.pauseId,
        step_id: pause.stepId,
      },
    });
  }, [onContinue, pause.pauseId, pause.stepId]);

  return (
    <section
      className="flex flex-col gap-3 border-b border-border bg-amber-500/5 px-4 py-3"
      aria-label="Resume paused workflow"
    >
      <span className="w-fit rounded-md bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
        Paused
      </span>

      {pause.prompt && (
        <p className="text-sm leading-relaxed text-foreground">
          {pause.prompt}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleContinue}
          disabled={busy}
          className="flex-1"
        >
          Continue
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>

      {!isConnected && (
        <p className="text-xs text-muted-foreground" role="status">
          Connecting…
        </p>
      )}
    </section>
  );
}
