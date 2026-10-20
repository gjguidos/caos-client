
"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

import { DynamicFormRenderer } from "@/app/(workspace)/_tool-form/DynamicFormRenderer";
import { formErrors } from "@/app/(workspace)/_tool-form/validateField";

import type {
  RunEvent,
  RunStatus,
  WorkflowStep,
} from "@/shared/lib/workflow/workflow.types";

import type { RunTab } from "../_hooks/useRunPanelTab";

import {
  isFileInput,
  runInputLabel,
  type RunInputLookup,
} from "../_lib/runInputDisplay";

import { EventsPanel } from "./EventsPanel";
import { PanelTabs } from "./PanelTabs";
import { RunOutputs, selectProducedSteps } from "./RunOutputs";
import { Field, OutputDisplay } from "./StepOutput";

export interface RunPanelProps {
  /** Declared workflow inputs, rendered via the shared dynamic form. */
  inputs: UIComponent[];

  /** The declaration behind an input key. */
  getRunInput: RunInputLookup;

  groupLabelMap?: Record<string, string>;

  steps: WorkflowStep[];
  stepOutputs: Record<string, unknown>;
  stepErrors: Record<string, string>;

  /** Step IDs in the order they first produced something. */
  outputOrder: string[];

  /** Chronological run event log, oldest first. */
  events: RunEvent[];

  /** Values the active run was started with. */
  runInputs: Record<string, unknown> | null;

  /** Draft form values owned by the workspace page. */
  values: FormValues;
  onValueChange: (
    key: string,
    value: FormValues[string]
  ) => void;

  runStatus: RunStatus | null;
  isStarting: boolean;
  isConnected: boolean;
  error?: string | null;

  activeTab: RunTab;
  onTabChange: (tab: RunTab) => void;

  onRun: (inputs: Record<string, unknown>) => void;

  getStepLabel: (
    stepId: string
  ) => string | undefined;

  onSelectStep: (stepId: string) => void;
}

/**
 * Run-scoped panel with three views:
 *
 * - Inputs: configure or inspect submitted values
 * - Events: chronological execution history
 * - Outputs: produced artifacts and errors
 *
 * The active tab is managed by the parent workflow lifecycle.
 */
export function RunPanel({
  inputs,
  getRunInput,
  groupLabelMap,
  steps,
  stepOutputs,
  stepErrors,
  outputOrder,
  events,
  runInputs,
  values,
  onValueChange,
  runStatus,
  isStarting,
  isConnected,
  error,
  activeTab,
  onTabChange,
  onRun,
  getStepLabel,
  onSelectStep,
}: Readonly<RunPanelProps>) {
  const hasRun = runStatus !== null || isStarting;

  const hasErrors = useMemo(
    () => Object.keys(formErrors(inputs, values)).length > 0,
    [inputs, values]
  );

  const producedCount = useMemo(
    () =>
      selectProducedSteps(
        steps,
        stepOutputs,
        stepErrors,
        outputOrder
      ).length,
    [steps, stepOutputs, stepErrors, outputOrder]
  );

  const isRunning =
    runStatus === "RUNNING" || isStarting;

  const canSubmit =
    isConnected && !isRunning && !hasErrors;

  const tabs = useMemo(
    () =>
      [
        {
          id: "inputs" as const,
          label: "Inputs",
        },
        {
          id: "events" as const,
          label: "Events",
          count: events.length,
        },
        {
          id: "outputs" as const,
          label: "Outputs",
          count: producedCount,
        },
      ] satisfies ReadonlyArray<{
        id: RunTab;
        label: string;
        count?: number;
      }>,
    [events.length, producedCount]
  );

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden"
      aria-label="Run"
    >
      <PanelTabs
        tabs={tabs}
        active={activeTab}
        onChange={onTabChange}
        ariaLabel="Run details"
      />

      {/* Events manages its own scroll position. */}
      <div
        className={`min-h-0 flex-1 ${
          activeTab === "events"
            ? "overflow-hidden"
            : "overflow-y-auto"
        }`}
      >
        {activeTab === "inputs" ? (
          hasRun ? (
            <SubmittedInputs
              values={runInputs}
              getRunInput={getRunInput}
            />
          ) : (
            <div className="flex h-full flex-col gap-6 p-4">
              {inputs.length > 0 ? (
                <DynamicFormRenderer
                  uiComponents={inputs}
                  groupLabelMap={{
                    inputs: "Inputs",
                    ...groupLabelMap,
                  }}
                  values={values}
                  onChange={onValueChange}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This workflow takes no inputs. Run it
                  when you&apos;re ready.
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              <div className="mt-auto space-y-2">
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  className="w-full"
                  onClick={() => onRun(values)}
                  disabled={!canSubmit}
                  aria-busy={isStarting}
                >
                  {isStarting && (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}

                  {isStarting
                    ? "Starting workflow..."
                    : "Run workflow"}
                </Button>

                {!isConnected && (
                  <p
                    className="text-xs text-muted-foreground"
                    role="status"
                  >
                    Connecting to the agent…
                  </p>
                )}

                {hasErrors && isConnected && (
                  <p className="text-xs text-muted-foreground">
                    Some inputs still need attention
                    before this can run.
                  </p>
                )}
              </div>
            </div>
          )
        ) : activeTab === "events" ? (
          <EventsPanel
            events={events}
            getStepLabel={getStepLabel}
            onSelectStep={onSelectStep}
          />
        ) : (
          <RunOutputs
            steps={steps}
            stepOutputs={stepOutputs}
            stepErrors={stepErrors}
            outputOrder={outputOrder}
          />
        )}
      </div>
    </section>
  );
}

/**
 * Displays the values submitted when the run started.
 *
 * Uses the original input declarations to preserve
 * labels and distinguish file inputs from other values.
 */
function SubmittedInputs({
  values,
  getRunInput,
}: Readonly<{
  values: Record<string, unknown> | null;
  getRunInput: RunInputLookup;
}>) {
  const entries = Object.entries(values ?? {});

  if (entries.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        This run was started without inputs.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {entries.map(([key, value]) => {
        const input = getRunInput(key);

        return (
          <Field
            key={key}
            label={runInputLabel(key, input)}
          >
            <OutputDisplay
              value={value}
              isFile={isFileInput(input)}
            />
          </Field>
        );
      })}
    </div>
  );
}
