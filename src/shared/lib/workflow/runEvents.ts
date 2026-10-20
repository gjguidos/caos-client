import type { RunEvent, StepStatus } from "./workflow.types";

/**
 * Accessors that collapse `RunEvent`'s variants down to the two fields every
 * surface actually renders, so the narrowing lives here rather than being
 * re-derived in each component.
 */

/** The step an event belongs to, or undefined when it is run-scoped. */
export function stepIdOf(event: RunEvent): string | undefined {
  return event.kind === "run" ? undefined : event.stepId;
}

/** The status an event reports, or undefined for a plain log line. */
export function statusOf(event: RunEvent): StepStatus | undefined {
  // `RunStatus` is a subset of `StepStatus`, so run and step events share the
  // one presentation table in `runStatusMeta`.
  return event.kind === "log" ? undefined : event.status;
}
