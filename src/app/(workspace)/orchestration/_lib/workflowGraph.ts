/**
 * workflowGraph — pure builder that turns a workflow definition into a logical
 * graph of nodes + edges. No layout engine, no React Flow imports: positions are
 * applied later by `layoutAdapter`. This keeps the edge/label logic trivially
 * unit-testable (assert node/edge *sets*, never coordinates).
 *
 * Edge rules (mirror the backend's dependency normalization):
 *  - explicit `next`:        step → each id in `next`
 *  - explicit `depends_on`:  each id in `depends_on` → step
 *  - sequential fallback:    in sequential mode (the default when unset), a step
 *    with no declared `depends_on` gets an implied edge from the previous step,
 *    so a bare list of steps renders as a chain instead of disconnected dots.
 */

import type {
  StepStatus,
  StepType,
  WorkflowDefinition,
  WorkflowStep,
} from "@/shared/lib/workflow/workflow.types";

/** React-Flow-compatible node payload. */
export interface WorkflowNodeData {
  step: WorkflowStep;
  label: string;
  stepType: StepType;
  /** For tool steps: the tool name parsed from the leading `@<tool>` of `command`. */
  toolName?: string;
  /** Live run status, injected by the canvas from the `workflowRun` slice. */
  status?: StepStatus;
  /** Elapsed ms for the step, injected by the canvas; null when not started. */
  elapsedMs?: number | null;
  [key: string]: unknown;
}

export interface WorkflowGraphNode {
  id: string;
  /** React Flow custom node type key. */
  type: "workflowStep";
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowGraph {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
}

/** Parse the leading `@<tool>` token from a step command, if any. */
export function parseToolName(command: string | undefined): string | undefined {
  if (!command) return undefined;
  const match = command.trim().match(/^@(\S+)/);
  return match ? match[1] : undefined;
}

/** Human label for a step: authored `label`, then `ui.label`, then the id. */
function resolveLabel(step: WorkflowStep): string {
  if (step.label) return step.label;
  const uiLabel = step.ui?.label;
  if (typeof uiLabel === "string" && uiLabel) return uiLabel;
  return step.id;
}

function isSequential(definition: WorkflowDefinition): boolean {
  // Default to sequential when unset so a bare step list renders as a chain.
  return (
    definition.execution_mode === undefined ||
    definition.execution_mode === "sequential"
  );
}

/** Build the logical graph (nodes + edges) for a workflow definition. */
export function buildWorkflowGraph(
  definition: WorkflowDefinition
): WorkflowGraph {
  const steps = definition.steps ?? [];
  const stepIds = new Set(steps.map((s) => s.id));

  const nodes: WorkflowGraphNode[] = steps.map((step) => ({
    id: step.id,
    type: "workflowStep",
    position: { x: 0, y: 0 },
    data: {
      step,
      label: resolveLabel(step),
      stepType: step.type,
      toolName: step.type === "tool" ? parseToolName(step.command) : undefined,
    },
  }));

  // Dedupe edges by source→target; ignore edges pointing at unknown steps.
  const edgeKeys = new Set<string>();
  const edges: WorkflowGraphEdge[] = [];
  const addEdge = (source: string, target: string) => {
    if (!stepIds.has(source) || !stepIds.has(target)) return;
    if (source === target) return;
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ id: `e-${source}-${target}`, source, target });
  };

  // Explicit edges.
  for (const step of steps) {
    for (const next of step.next ?? []) addEdge(step.id, next);
    for (const dep of step.depends_on ?? []) addEdge(dep, step.id);
  }

  // Sequential fallback: chain steps with no declared predecessor.
  if (isSequential(definition)) {
    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      const hasDeclaredDep = (step.depends_on?.length ?? 0) > 0;
      if (!hasDeclaredDep) addEdge(steps[i - 1].id, step.id);
    }
  }

  return { nodes, edges };
}
