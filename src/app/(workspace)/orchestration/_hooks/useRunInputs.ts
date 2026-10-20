"use client";

import type { FormValues } from "@/app/(workspace)/_tool-form/toolForm.types";
import { useCallback, useState } from "react";

export interface UseRunInputsReturn {
  /** Values typed into the run form, keyed by input id. */
  values: FormValues;
  setValue: (key: string, value: FormValues[string]) => void;
}

/**
 * The values typed into the run form, owned here rather than by `RunPanel` for
 * the same reason as `useRunPanelTab`: the panel is unmounted while a step is
 * selected, so a half-filled form would not survive a click on the canvas.
 *
 * Values outlive a run, so "Run again" comes back pre-filled and a rerun is a
 * tweak rather than a retype. They are dropped when the workflow changes —
 * another workflow's inputs are not these, even where the keys happen to match.
 */
export function useRunInputs(workflowKey: string | null): UseRunInputsReturn {
  const [values, setValues] = useState<FormValues>({});
  const [lastKey, setLastKey] = useState(workflowKey);

  // Reset during render rather than in an effect, so the newly selected
  // workflow's form never paints once carrying the previous one's values. A key
  // arriving for the first time is the definition loading, not a switch, so a
  // form filled during that window is kept.
  if (lastKey !== workflowKey) {
    setLastKey(workflowKey);
    if (lastKey !== null) setValues({});
  }

  const setValue = useCallback((key: string, value: FormValues[string]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { values, setValue };
}
