"use client";

import { buildArtifactFilename } from "@/shared/lib/download";
import { createContext, useContext, useMemo } from "react";

interface RunArtifact {
  workflowKey: string | null;
  runId: string | null;
}

/**
 * Identity of the run whose artifacts are being downloaded.
 *
 * `workflowKey` and `runId` are needed only to *name* a downloaded file, but the
 * buttons that do the naming sit several layers below the page that knows them
 * — under the run panel's outputs list, inside the step panel's output tab, on
 * the event rail. Threading two props through every intermediate component made
 * five components declare and forward values none of them used. The page
 * publishes them once instead.
 *
 * Defaults to an anonymous run so a component can be rendered (and tested) on
 * its own; `buildArtifactFilename` degrades to a bare `output.<ext>`.
 */
const RunArtifactContext = createContext<RunArtifact>({
  workflowKey: null,
  runId: null,
});

export function RunArtifactProvider({
  workflowKey,
  runId,
  children,
}: Readonly<{
  workflowKey?: string | null;
  runId: string | null;
  children: React.ReactNode;
}>) {
  const value = useMemo(
    () => ({ workflowKey: workflowKey ?? null, runId }),
    [workflowKey, runId]
  );

  return (
    <RunArtifactContext.Provider value={value}>
      {children}
    </RunArtifactContext.Provider>
  );
}

/** The current run's identity, for callers that put it *inside* a file. */
export function useRunArtifact(): RunArtifact {
  return useContext(RunArtifactContext);
}

/**
 * The step whose *own* output is being shown, if any.
 *
 * Only a step's own output can be saved as an artifact of the run. The same
 * value shown as a downstream step's resolved input is an echo of it, and
 * offers no download - so "is this downloadable?" and "which step is it?" are
 * one question, answered by whether a subtree sits inside a provider.
 */
const StepArtifactContext = createContext<string | null>(null);

export function StepArtifactProvider({
  stepId,
  children,
}: Readonly<{ stepId: string; children: React.ReactNode }>) {
  return (
    <StepArtifactContext.Provider value={stepId}>
      {children}
    </StepArtifactContext.Provider>
  );
}

/**
 * Names a downloadable artifact of the current step, or `null` when there is no
 * step to attribute one to.
 *
 * `parts` identify the artifact within the step - a value's label, and its
 * position when the step produced several files.
 */
export function useStepArtifactName():
  | ((parts: string[], extension: string) => string)
  | null {
  const { workflowKey, runId } = useRunArtifact();
  const stepId = useContext(StepArtifactContext);

  return useMemo(() => {
    if (stepId === null) return null;
    return (parts, extension) =>
      buildArtifactFilename({
        workflowKey,
        runId,
        parts: [stepId, ...parts],
        extension,
      });
  }, [workflowKey, runId, stepId]);
}
