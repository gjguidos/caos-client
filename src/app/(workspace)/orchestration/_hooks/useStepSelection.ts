"use client";

import type { WorkflowPauseInfo } from "@/shared/lib/workflow/workflow.types";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseStepSelectionReturn {
  /** The step the side panel is scoped to; null means run scope. */
  selectedStepId: string | null;
  select: (stepId: string | null) => void;
  clear: () => void;
}

/**
 * Which step the side panel is scoped to.
 *
 * A pause gate takes the panel the moment it arrives: the run cannot advance
 * until it is answered, and the gate lives in the step's panel now that it is no
 * longer on the canvas. Keyed on the pause id rather than on being paused at
 * all, so a reader who goes back to run scope while still paused is not dragged
 * to the step again on the next render.
 */
export function useStepSelection(
  pause: WorkflowPauseInfo | null
): UseStepSelectionReturn {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const shownPauseId = useRef<string | null>(null);

  const pauseId = pause?.pauseId ?? null;
  const pauseStepId = pause?.stepId ?? null;

  useEffect(() => {
    if (pauseId === null) {
      shownPauseId.current = null;
      return;
    }
    if (pauseId === shownPauseId.current) return;
    shownPauseId.current = pauseId;
    if (pauseStepId !== null) setSelectedStepId(pauseStepId);
  }, [pauseId, pauseStepId]);

  const select = useCallback((stepId: string | null) => {
    setSelectedStepId(stepId);
  }, []);

  const clear = useCallback(() => setSelectedStepId(null), []);

  return { selectedStepId, select, clear };
}
