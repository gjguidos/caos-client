/**
 * builderGraph — the one genuinely new pure layer for the editable canvas.
 *
 * React Flow owns the live graph; the `WorkflowDefinition` is serialized on demand
 * (on Save) by `buildDefinitionFromGraph`. Edges are authored as `depends_on` only
 * (`A → B` means `B.depends_on += A`) and the result is always `execution_mode:
 * "dag"` so the engine's implicit sequential chaining never kicks in. `next` is
 * never emitted (it is being stripped from the backend).
 *
 * Kept free of React Flow imports so it stays trivially unit-testable.
 */

import type {
  StepType,
  WorkflowDefinition,
  WorkflowStep,
} from "@/shared/lib/workflow/workflow.types";
import type { WorkflowGraph } from "@/app/(workspace)/orchestration/_lib/workflowGraph";
import type { WorkflowValidationIssue } from "@/shared/api/fetch_workflows";

/** A backend validation issue surfaced on a node (`422` `errors[]` subset). */
export interface BuilderNodeIssue {
  code: string;
  message: string;
}

/** Data payload for a builder React Flow node (`type: "builderStep"`). */
export interface BuilderNodeData {
  stepType: StepType;
  /** Human-facing label (defaults to tool name or step-type label). */
  label: string;
  /** Tool steps only: the `@<tool>` command. */
  command?: string;
  /** Tool steps only: the tool key parsed from `command`. */
  toolName?: string;
  /**
   * Tool steps only: file-input slot bindings (`slotName → ${outputs.<id>.<key>}`).
   * Serialized to the step's `file_bindings`; only non-empty entries survive.
   */
  fileBindings?: Record<string, string>;
  /** Backend validation issues mapped onto this node; drives the error ring. */
  issues?: BuilderNodeIssue[];
  [key: string]: unknown;
}

/** Minimal node/edge shapes the serializer needs (a subset of RF's types). */
interface SerializableNode {
  id: string;
  data: BuilderNodeData;
}
interface SerializableEdge {
  source: string;
  target: string;
}

/**
 * A builder node/edge as produced by the in-adapter. Structurally a subset of
 * React Flow's `Node`/`Edge` (the remaining RF fields are optional), so these are
 * assignable straight into `useNodesState`/`useEdgesState` without RF imports here.
 */
export interface BuilderNode {
  id: string;
  type: "builderStep";
  position: { x: number; y: number };
  data: BuilderNodeData;
}
export interface BuilderEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * Serialize the live RF graph into a `WorkflowDefinition`.
 *
 * - For each edge `A → B`, push `A` into `B`'s `depends_on` (deduped, order-stable).
 * - Emit each node as a `WorkflowStep` (`command` only for tool steps).
 * - Always `execution_mode: "dag"`; never emit `next`; never write positions.
 */
export function buildDefinitionFromGraph(
  nodes: ReadonlyArray<SerializableNode>,
  edges: ReadonlyArray<SerializableEdge>
): WorkflowDefinition {
  const nodeIds = new Set(nodes.map((n) => n.id));

  // depends_on[target] = [sources…], deduped and in edge-insertion order.
  const dependsOn = new Map<string, string[]>();
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    const deps = dependsOn.get(edge.target) ?? [];
    if (!deps.includes(edge.source)) deps.push(edge.source);
    dependsOn.set(edge.target, deps);
  }

  const steps: WorkflowStep[] = nodes.map((node) => {
    const step: WorkflowStep = { id: node.id, type: node.data.stepType };
    if (node.data.stepType === "tool" && node.data.command) {
      step.command = node.data.command;
    }
    // file_bindings is tool-only (the backend 422s it elsewhere); emit only the
    // non-empty slot entries so cleared slots don't leave a stray binding behind.
    if (node.data.stepType === "tool") {
      const bindings = pruneFileBindings(node.data.fileBindings);
      if (bindings) step.file_bindings = bindings;
    }
    if (node.data.label) step.label = node.data.label;
    const deps = dependsOn.get(node.id);
    if (deps && deps.length > 0) step.depends_on = deps;
    return step;
  });

  return { execution_mode: "dag", steps };
}

/**
 * Drop slots with an empty value and return `undefined` when nothing remains, so
 * an all-cleared `file_bindings` map is omitted from the step entirely.
 * Deliberately overlaps with `onChangeFileBinding` (which never stores empties):
 * this also covers bindings loaded from an existing definition.
 */
function pruneFileBindings(
  bindings: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!bindings) return undefined;
  const entries = Object.entries(bindings).filter(([, value]) => value?.trim());
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * In-adapter: project a laid-out `WorkflowGraph` (from the shared read path) onto
 * builder nodes. The inverse of `buildDefinitionFromGraph` — together they form
 * the editable round-trip (definition → graph → builder → definition).
 */
export function graphToBuilderNodes(graph: WorkflowGraph): BuilderNode[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: "builderStep",
    position: n.position,
    data: {
      stepType: n.data.stepType,
      label: n.data.label,
      command: n.data.step.command,
      toolName: n.data.toolName,
      fileBindings: n.data.step.file_bindings,
    },
  }));
}

/** In-adapter: project a `WorkflowGraph`'s edges onto builder edges. */
export function graphToBuilderEdges(graph: WorkflowGraph): BuilderEdge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
}

/** Backend issues split into per-node rings and graph-wide (unmappable) issues. */
export interface MappedIssues {
  byNode: Map<string, BuilderNodeIssue[]>;
  globalIssues: WorkflowValidationIssue[];
}

/**
 * Map backend `422` validation issues onto nodes. An issue routes to a node by
 * `step_id`, else fans out to every node whose `toolName` matches `tool_key`;
 * anything unattributable (a `step_id`/`tool_key` with no matching node, or
 * neither) is global so it's still surfaced rather than silently dropped.
 */
export function mapIssuesToNodes(
  nodes: ReadonlyArray<SerializableNode>,
  issues: ReadonlyArray<WorkflowValidationIssue>
): MappedIssues {
  const byNode = new Map<string, BuilderNodeIssue[]>();
  const globalIssues: WorkflowValidationIssue[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  const push = (id: string, issue: WorkflowValidationIssue) => {
    const list = byNode.get(id) ?? [];
    list.push({ code: issue.code, message: issue.message });
    byNode.set(id, list);
  };

  for (const issue of issues) {
    if (issue.step_id) {
      // A step_id the client no longer has (graph changed before the 422 landed)
      // would otherwise sink into byNode under a key nothing reads — surface it.
      if (nodeIds.has(issue.step_id)) push(issue.step_id, issue);
      else globalIssues.push(issue);
    } else if (issue.tool_key) {
      const targets = nodes.filter((n) => n.data.toolName === issue.tool_key);
      if (targets.length > 0) targets.forEach((n) => push(n.id, issue));
      else globalIssues.push(issue);
    } else {
      globalIssues.push(issue);
    }
  }

  return { byNode, globalIssues };
}
