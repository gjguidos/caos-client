
"use client";

import { useMemo } from "react";

import type { WorkflowStep } from "@/shared/lib/workflow/workflow.types";

import { StepArtifactProvider } from "./RunArtifactContext";
import { OutputAction, OutputDisplay } from "./StepOutput";

export interface RunOutputsProps {
  steps: WorkflowStep[];
  stepOutputs: Record<string, unknown>;
  stepErrors: Record<string, string>;

  /** Step ids in the order they first produced something. */
  outputOrder: string[];
}

/**
 * Selects tool steps that produced an output or error,
 * preserving the original output arrival order.
 *
 * Non-tool steps (pause, set, wait_event, end)
 * are excluded from the results list.
 */
export function selectProducedSteps(
  steps: WorkflowStep[],
  stepOutputs: Record<string, unknown>,
  stepErrors: Record<string, string>,
  outputOrder: string[]
): WorkflowStep[] {
  const stepById = new Map(
    steps.map((step) => [step.id, step])
  );

  return outputOrder
    .map((stepId) => stepById.get(stepId))
    .filter(
      (step): step is WorkflowStep =>
        step !== undefined
    )
    .filter((step) => step.type === "tool")
    .filter(
      (step) =>
        stepOutputs[step.id] !== undefined ||
        stepErrors[step.id] !== undefined
    );
}

/**
 * Displays all workflow outputs in the order they arrived.
 *
 * Only tool steps with outputs or errors are included.
 * Failed steps are shown even if they have no output.
 */
export function RunOutputs({
  steps,
  stepOutputs,
  stepErrors,
  outputOrder,
}: Readonly<RunOutputsProps>) {
  const produced = useMemo(
    () =>
      selectProducedSteps(
        steps,
        stepOutputs,
        stepErrors,
        outputOrder
      ),
    [steps, outputOrder, stepOutputs, stepErrors]
  );

  if (produced.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No outputs yet. Completed steps show their results here.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {produced.map((step) => (
        <OutputEntry
          key={step.id}
          step={step}
          output={stepOutputs[step.id]}
          error={stepErrors[step.id]}
        />
      ))}
    </ol>
  );
}

function OutputEntry({
  step,
  output,
  error,
}: Readonly<{
  step: WorkflowStep;
  output: unknown;
  error?: string;
}>) {
  const label = step.label ?? step.id;

  return (
    <li
      data-testid={`output-entry-${step.id}`}
      className="px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <h3
          className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
          title={label}
        >
          {label}
        </h3>

        {output !== undefined && (
          <OutputAction
            value={output}
            label={label}
          />
        )}
      </div>

      <div className="mt-3 space-y-3">
        {error && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3"
            role="alert"
          >
            <pre className="max-h-[150px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-destructive">
              {error}
            </pre>
          </div>
        )}

        {output !== undefined && (
          <StepArtifactProvider stepId={step.id}>
            <OutputDisplay value={output} />
          </StepArtifactProvider>
        )}
      </div>
    </li>
  );
}
