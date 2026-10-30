"use client";

import type { CognitiveModuleMap } from "@/app/agents/_api/fetch_cognitive_modules";
import { AgentFormValues } from "@/shared/lib/agent.types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Gap, getDraftGaps, gapsForStep, isStepAnswered } from "./draftStatus";
import { focusField } from "./focusField";
import {
  MENU_ORDER,
  MenuSection,
  type StepStatus,
} from "./sections/wizardSteps";

/**
 * Wizard-wide completeness, shared by both routes.
 *
 * A step is only flagged once the reader has been there and moved on. Marking a
 * blank form in red before anyone has typed reads as scolding, and the "Before
 * you create" list already says what is outstanding without the alarm.
 */
export function useDraftStatus(
  form: UseFormReturn<AgentFormValues>,
  cognitiveModules: CognitiveModuleMap,
  selected: MenuSection,
  onSelect: (step: MenuSection) => void,
  resolveGaps?: (values: AgentFormValues) => Gap[]
) {
  const values = useWatch({ control: form.control }) as AgentFormValues;
  const [visited, setVisited] = useState<Set<MenuSection>>(
    () => new Set([selected])
  );
  const [target, setTarget] = useState<Gap | null>(null);

  useEffect(() => {
    setVisited((prev) =>
      prev.has(selected) ? prev : new Set(prev).add(selected)
    );
  }, [selected]);

  const gaps = useMemo(
    () =>
      values
        ? resolveGaps
          ? resolveGaps(values)
          : getDraftGaps(values, { cognitiveModules })
        : [],
    [values, cognitiveModules, resolveGaps]
  );

  /**
   * The gap being followed, and only for as long as it is still a gap. Filling
   * the field drops it from `gaps`, which retires the inline message and closes
   * anything that opened to show it - no bookkeeping, because there is nothing
   * to undo.
   */
  const activeGap = useMemo(
    () =>
      target && gaps.some((g) => g.field === target.field) ? target : null,
    [target, gaps]
  );

  const stepStatus = useMemo(() => {
    const status: Partial<Record<MenuSection, StepStatus>> = {};
    MENU_ORDER.forEach((step) => {
      // The step underfoot is never marked: a verdict on the answer you are
      // still typing is noise.
      if (!visited.has(step) || step === selected) return;
      if (gapsForStep(gaps, step).length > 0) {
        status[step] = "attention";
      } else if (values && isStepAnswered(values, step, gaps)) {
        status[step] = "done";
      }
    });
    return status;
  }, [gaps, values, visited, selected]);

  const goToGap = useCallback(
    (gap: Gap) => {
      onSelect(gap.step);
      // A fresh object per call, so the active gap's identity is the visit
      // rather than the field. Following the same gap twice is two visits, and
      // anything that opened for the first one gets to open again.
      setTarget({ ...gap });
      focusField(gap.field);
    },
    [onSelect]
  );

  const goToFirstGap = useCallback(() => {
    if (gaps[0]) goToGap(gaps[0]);
  }, [gaps, goToGap]);

  return { gaps, activeGap, stepStatus, goToGap, goToFirstGap };
}
