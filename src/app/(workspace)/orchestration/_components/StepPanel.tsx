
"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type {
  StepStatus,
  StepTiming,
  WorkflowStep,
} from "@/shared/lib/workflow/workflow.types";

import { useTicker } from "../_hooks/useTicker";
import { formatDuration, stepElapsed } from "../_lib/formatDuration";
import type { ResolutionContext } from "../_lib/resolveStepInputs";
import type { RunInputLookup } from "../_lib/runInputDisplay";

import { PanelTabs } from "./PanelTabs";
import { PauseForm, type PauseGate } from "./PauseForm";
import { getNodeStatusMeta } from "./runStatusMeta";
import { StepInputs } from "./StepInputs";
import { StepArtifactProvider } from "./RunArtifactContext";
import { OutputAction, OutputDisplay } from "./StepOutput";

type StepTab = "input" | "output";

export interface StepPanelProps {
  step: WorkflowStep;
  label: string;
  status?: StepStatus;
  timing?: StepTiming;
  output?: unknown;
  error?: string;

  /** Active human-in-the-loop gate for this step. */
  pause?: PauseGate | null;

  resolution: ResolutionContext;
  getStepLabel: (stepId: string) => string | undefined;
  getRunInput: RunInputLookup;
  onSelectStep: (stepId: string) => void;
  onBack: () => void;
}

/**
 * Displays a selected workflow step's inputs and outputs.
 *
 * Step selection changes the panel scope, not the canvas.
 * Closing returns to the run-level panel.
 */
export function StepPanel({
  step,
  label,
  status,
  timing,
  output,
  error,
  pause,
  resolution,
  getStepLabel,
  getRunInput,
  onSelectStep,
  onBack,
}: Readonly<StepPanelProps>) {
  const [tab, setTab] = useState<StepTab>("input");

  const statusMeta = status
    ? getNodeStatusMeta(status)
    : null;

  const now = useTicker(status === "RUNNING");
  const elapsed = stepElapsed(timing, now);

  // Capture Escape globally because focus may still
  // belong to a selected node on the workflow canvas.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented
      ) {
        onBack();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack]);

  const tabs = useMemo(
    () =>
      [
        { id: "input" as const, label: "Input" },
        { id: "output" as const, label: "Output" },
      ] satisfies ReadonlyArray<{
        id: StepTab;
        label: string;
      }>,
    []
  );

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden"
      aria-label={`Step ${label}`}
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-start gap-2">
          <h2
            className="min-w-0 flex-1 truncate text-base font-semibold text-foreground"
            title={label}
          >
            {label}
          </h2>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close step details"
            title="Close step details (Esc)"
            onClick={onBack}
            className="-mr-2 -mt-1 size-8 shrink-0"
          >
            <X
              className="size-4"
              aria-hidden="true"
            />
          </Button>
        </div>

        {(statusMeta || elapsed !== null) && (
          <p className="text-sm text-muted-foreground">
            {[
              statusMeta?.label,
              elapsed !== null
                ? formatDuration(elapsed)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      {pause && (
        <div className="shrink-0">
          <PauseForm
            pause={pause.info}
            isResuming={pause.isResuming}
            isConnected={pause.isConnected}
            onContinue={pause.onContinue}
            onCancel={pause.onCancel}
          />
        </div>
      )}

      <PanelTabs
        tabs={tabs}
        active={tab}
        onChange={setTab}
        ariaLabel="Step details"
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "input" && (
          <StepInputs
            step={step}
            context={resolution}
            getStepLabel={getStepLabel}
            getRunInput={getRunInput}
            onSelectStep={onSelectStep}
          />
        )}

        {tab === "output" && (
          <StepOutputTab
            step={step}
            status={status}
            output={output}
            error={error}
          />
        )}
      </div>
    </section>
  );
}

function StepOutputTab({
  step,
  status,
  output,
  error,
}: Readonly<{
  step: WorkflowStep;
  status?: StepStatus;
  output?: unknown;
  error?: string;
}>) {
  return (
    <div className="space-y-4 p-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3"
        >
          <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-destructive">
            {error}
          </pre>
        </div>
      )}

      {output !== undefined ? (
        <StepArtifactProvider stepId={step.id}>
          <div className="flex justify-end empty:hidden">
            <OutputAction
              value={output}
              label={step.label ?? step.id}
            />
          </div>

          <OutputDisplay value={output} />
        </StepArtifactProvider>
      ) : (
        !error && (
          <p className="text-sm text-muted-foreground">
            {emptyOutputCopy(status)}
          </p>
        )
      )}

      {step.pause?.prompt && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pause prompt
          </p>

          <p className="text-sm leading-relaxed text-foreground/80">
            {step.pause.prompt}
          </p>
        </div>
      )}
    </div>
  );
}

function emptyOutputCopy(status?: StepStatus): string {
  switch (status) {
    case "RUNNING":
      return "Still running.";

    case "PAUSED":
      return "Waiting for your answer on the canvas.";

    case "SKIPPED":
      return "This step was skipped.";

    case "CANCELLED":
      return "This step was cancelled.";

    case "COMPLETED":
      return "This step produced no output.";

    default:
      return "Waiting on earlier steps.";
  }
}
