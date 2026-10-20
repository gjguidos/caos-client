"use client";

import type { ConnectionState } from "@/app/(workspace)/chat/websocket.types";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useAgentData } from "../../../chat/_hooks/useAgentData";
import type {
  PauseContinuePayload,
  PauseGate,
} from "../../_components/PauseForm";
import { RunBar } from "../../_components/RunBar";
import { RunPanel } from "../../_components/RunPanel";
import { StepPanel } from "../../_components/StepPanel";
import { WorkflowCanvas } from "../../_components/WorkflowCanvas";
import { useRunInputs } from "../../_hooks/useRunInputs";
import { useRunPanelTab } from "../../_hooks/useRunPanelTab";
import { useStepSelection } from "../../_hooks/useStepSelection";
import { useWorkflowDefinition } from "../../_hooks/useWorkflowDefinition";
import { useWorkflowRun } from "../../_hooks/useWorkflowRun";
import { toEpochMs } from "../../_lib/formatDuration";
import { createRunInputLookup } from "../../_lib/runInputDisplay";
import { RunArtifactProvider } from "../../_components/RunArtifactContext";
import type { StepStatus } from "@/shared/lib/workflow/workflow.types";

/**
 * Orchestration (canvas) workspace — the live view of a workflow run.
 *
 * Two surfaces: the canvas holds the topology (what depends on what, and its
 * state), and the side panel holds everything else, scoped either to the run
 * (inputs, chronology, outputs) or to one step.
 *
 * Selecting a node changes the panel's *scope*, not the page's mode: the canvas
 * keeps updating underneath, and the run tabs keep tracking the run's lifecycle
 * so Back lands on whichever one is now worth reading. A pause gate scopes the
 * panel to its step on arrival and releases it once answered.
 */
export default function OrchestrationWorkspace() {
  const { agent_system_name, agent_id } = useParams();
  const { userId, isAuthLoading } = useAuth();

  const agent = useAgentData({ agentId: agent_id as string });
  const workflow = useWorkflowDefinition(agent.agentData, agent_id as string);
  const agentName = agent.agentData?.name ?? "";

  const run = useWorkflowRun({
    agentSystemName: (agent_system_name as string) ?? "",
    agentId: agent_id as string,
    agentName,
    userId: userId ?? "",
    workflowKey: workflow.activeKey,
    enabled: !!userId && !!agentName,
  });

  const activePause = run.activePause;
  const isPaused = run.runStatus === "PAUSED" && !!activePause;

  const {
    selectedStepId,
    select: handleSelectStep,
    clear: clearSelection,
  } = useStepSelection(isPaused ? activePause : null);

  const steps = useMemo(
    () => workflow.definition?.steps ?? [],
    [workflow.definition]
  );

  const stepById = useMemo(() => {
    const map = new Map(steps.map((step) => [step.id, step]));
    return map;
  }, [steps]);

  const getStepLabel = useCallback(
    (stepId: string) => {
      const step = stepById.get(stepId);
      return step ? (step.label ?? step.id) : undefined;
    },
    [stepById]
  );

  // The declaration behind an input key. It is what lets either panel name a run
  // input the way its form field does, and what says whether the value it holds
  // is a file rather than text - neither of which is recoverable from the value
  // once it reaches the run. Built once here and shared, so the run panel and
  // the step panel cannot answer the same key differently.
  const getRunInput = useMemo(
    () => createRunInputLookup(workflow.inputs),
    [workflow.inputs]
  );

  const selectedStep = selectedStepId
    ? stepById.get(selectedStepId)
    : undefined;

  const { tab: runTab, setTab: setRunTab } = useRunPanelTab(
    run.runStatus,
    run.isStarting
  );

  // Held at page scope so a half-filled form survives selecting a step, which
  // unmounts the run panel.
  const runForm = useRunInputs(workflow.activeKey);

  // The run's start, taken from the earliest step start the backend reported and
  // falling back to the first event we saw. Both are approximations of a value
  // the backend does not send for the run itself.
  const runStartedAt = useMemo(() => {
    const starts = Object.values(run.stepTimings)
      .map((timing) => toEpochMs(timing.startedAt))
      .filter((ms): ms is number => ms !== null);
    if (starts.length > 0) return Math.min(...starts);
    return run.events[0]?.ts ?? null;
  }, [run.stepTimings, run.events]);

  // Only the fields that have been answered. An untouched field is an empty
  // string, which is the form's own way of saying "nothing here" and not a value
  // any step would be given.
  const draftInputs = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(runForm.values).filter(
          ([, value]) => value !== undefined && value !== ""
        )
      ),
    [runForm.values]
  );

  // Once a run has been recorded, its inputs are the only truth about what its
  // steps were given - a form edited afterwards describes the next run, not this
  // one. So the draft answers only for a run that doesn't exist yet, and which
  // of the two applies is settled here rather than inside the resolver.
  const resolution = useMemo(
    () => ({
      inputs: run.runInputs ?? draftInputs,
      stepOutputs: run.stepOutputs,
    }),
    [run.runInputs, draftInputs, run.stepOutputs]
  );

  // Answering the gate hands the panel back to run scope: the step has said all
  // it has to say, and the run moves on from here.
  const handleContinue = useCallback(
    (payload: PauseContinuePayload) => {
      clearSelection();
      run.resume({ action: payload.action, data: payload.data });
    },
    [run, clearSelection]
  );
  const handlePauseCancel = useCallback(() => {
    clearSelection();
    if (activePause) {
      run.resume({
        action: "cancel",
        data: { pause_id: activePause.pauseId, step_id: activePause.stepId },
      });
    } else {
      run.cancel();
    }
  }, [run, activePause, clearSelection]);

  const handleNodeSelect = useCallback(
    (node: { id: string } | null) => handleSelectStep(node?.id ?? null),
    [handleSelectStep]
  );

  const handleRunAgain = useCallback(() => {
    clearSelection();
    run.resetRun();
  }, [run, clearSelection]);

  // The gate belongs to one step, so it travels with that step's panel, which is
  // also where you read what the step was given before deciding. `useStepSelection`
  // scopes the panel there as soon as the gate arrives.
  const pauseGate: PauseGate | null = isPaused
    ? {
        info: activePause,
        isResuming: run.isStarting,
        isConnected: run.isConnected,
        onContinue: handleContinue,
        onCancel: handlePauseCancel,
      }
    : null;

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Session unavailable
          </h1>
          <p className="text-sm text-muted-foreground">
            The local session could not be initialized. Check your local authentication configuration.
          </p>
        </div>
      </div>
    );
  }

  const hasWorkflow = steps.length > 0;

  return (
    <RunArtifactProvider workflowKey={workflow.activeKey} runId={run.runId}>
      <div className="flex h-full w-full flex-col">
        <RunBar
          agentName={agent.agentData?.name ?? ""}
          workflows={workflow.catalogEntries}
          workflowKey={workflow.activeKey}
          onWorkflowChange={workflow.setActiveKey}
          runStatus={run.runStatus}
          isStarting={run.isStarting}
          startedAt={runStartedAt}
          onCancel={run.cancel}
          onRunAgain={handleRunAgain}
        />
        <ConnectionBanner connectionState={run.connectionState} />

        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 flex-1">
            <CanvasBody
              isLoading={agent.isLoading || workflow.isLoading}
              error={agent.error || workflow.error}
              hasWorkflowKey={!!workflow.activeKey}
              definition={workflow.definition}
              nodeStatus={run.nodeStatus}
              stepTimings={run.stepTimings}
              selectedStepId={selectedStepId}
              onNodeSelect={handleNodeSelect}
            />
          </div>

          {hasWorkflow && (
            <aside className="flex w-[420px] shrink-0 flex-col border-l border-border bg-card">
              {selectedStep ? (
                <StepPanel
                  step={selectedStep}
                  label={selectedStep.label ?? selectedStep.id}
                  status={run.nodeStatus[selectedStep.id]}
                  timing={run.stepTimings[selectedStep.id]}
                  output={run.stepOutputs[selectedStep.id]}
                  error={run.stepErrors[selectedStep.id]}
                  pause={
                    pauseGate?.info.stepId === selectedStep.id
                      ? pauseGate
                      : null
                  }
                  resolution={resolution}
                  getStepLabel={getStepLabel}
                  getRunInput={getRunInput}
                  onSelectStep={handleSelectStep}
                  onBack={clearSelection}
                />
              ) : (
                <RunPanel
                  inputs={workflow.inputs}
                  getRunInput={getRunInput}
                  steps={steps}
                  stepOutputs={run.stepOutputs}
                  stepErrors={run.stepErrors}
                  outputOrder={run.outputOrder}
                  events={run.events}
                  runInputs={run.runInputs}
                  values={runForm.values}
                  onValueChange={runForm.setValue}
                  runStatus={run.runStatus}
                  isStarting={run.isStarting}
                  isConnected={run.isConnected}
                  error={run.error}
                  activeTab={runTab}
                  onTabChange={setRunTab}
                  onRun={run.start}
                  getStepLabel={getStepLabel}
                  onSelectStep={handleSelectStep}
                />
              )}
            </aside>
          )}
        </div>
      </div>
    </RunArtifactProvider>
  );
}

function CanvasBody({
  isLoading,
  error,
  hasWorkflowKey,
  definition,
  nodeStatus,
  stepTimings,
  selectedStepId,
  onNodeSelect,
}: Readonly<{
  isLoading: boolean;
  error: string | null;
  hasWorkflowKey: boolean;
  definition: ReturnType<typeof useWorkflowDefinition>["definition"];
  nodeStatus: Record<string, StepStatus>;
  stepTimings: ReturnType<typeof useWorkflowRun>["stepTimings"];
  selectedStepId: string | null;
  onNodeSelect?: (node: { id: string } | null) => void;
}>) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading workflow" role="status" />
      </div>
    );
  }

  if (error) {
    return <CenteredMessage title="Could not load workflow" body={error} />;
  }

  if (!hasWorkflowKey) {
    return (
      <CenteredMessage
        title="No workflow attached"
        body="This agent has no workflows attached. Attach one in the agent's Workflows settings."
      />
    );
  }

  if (!definition || definition.steps.length === 0) {
    return (
      <CenteredMessage
        title="Empty workflow"
        body="The selected workflow has no steps to display."
      />
    );
  }

  return (
    <WorkflowCanvas
      definition={definition}
      nodeStatus={nodeStatus}
      stepTimings={stepTimings}
      selectedStepId={selectedStepId}
      onNodeSelect={onNodeSelect}
    />
  );
}

function CenteredMessage({
  title,
  body,
}: Readonly<{ title: string; body: string }>) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/**
 * Thin banner shown when the WebSocket is in a degraded state so users know
 * why the canvas may not be updating live.
 */
function ConnectionBanner({
  connectionState,
}: Readonly<{ connectionState: ConnectionState }>) {
  if (connectionState === "reconnecting") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-700 dark:text-amber-400"
      >
        Reconnecting to agent…
      </div>
    );
  }
  if (connectionState === "disconnected" || connectionState === "error") {
    return (
      <div
        role="alert"
        className="border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-xs text-destructive"
      >
        Connection lost. Refresh the page to reconnect.
      </div>
    );
  }
  return null;
}
