/**
 * references - builder-side reference checks.
 *
 * The ${…} grammar itself lives in `@/shared/lib/workflow/references` (the run
 * page resolves the same tokens against a live run); import it from there. This
 * module owns only the dangling-reference scan, which needs the builder graph
 * and so cannot live in shared.
 */

import { collectDescendants, type DependencyEdge } from "./collectDescendants";
import type { BuilderNodeIssue } from "./builderGraph";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import {
  parseReferences,
  type Reference,
} from "@/shared/lib/workflow/references";

/** Minimal node shape the dangling-ref scan needs. */
interface ReferencingNode {
  id: string;
  data: {
    command?: string;
    toolName?: string;
    /** Tool steps only: file-slot bindings, each a `${outputs.…}` or `${inputs.…}` token. */
    fileBindings?: Record<string, string>;
  };
}

/** A declared output the scan checks a token's key against. */
interface DeclaredOutput {
  key: string;
}

/** Resolved graph context an output-reference check reads (constant per scan). */
interface OutputScanContext {
  nodeIds: ReadonlySet<string>;
  descendants: (producer: string) => ReadonlySet<string>;
  nodeById: ReadonlyMap<string, ReferencingNode>;
  getToolOutputs?: (
    toolName: string | undefined
  ) => ReadonlyArray<DeclaredOutput> | undefined;
}

/**
 * The issue an `inputs.<key>` reference raises, or `undefined` when it resolves.
 * `isSlot` distinguishes a file-slot binding (must be a `file` input) from a
 * command arg (must not be), so the same token is judged by where it appears.
 */
function classifyInputReference(
  ref: Reference,
  isSlot: boolean,
  declaredInputs: ReadonlyMap<string, WorkflowInputField>
): BuilderNodeIssue | undefined {
  const declared = declaredInputs.get(ref.key ?? "");
  if (!declared) {
    return {
      code: "DANGLING_INPUT_REFERENCE",
      message: `References undeclared input "${ref.key}".`,
    };
  }
  if (isSlot && declared.input !== "file") {
    return {
      code: "NON_FILE_INPUT_IN_SLOT",
      message: `File slot references input "${ref.key}", which is not a file input.`,
    };
  }
  if (!isSlot && declared.input === "file") {
    return {
      code: "FILE_INPUT_IN_ARG",
      message: `Command references file input "${ref.key}"; file inputs can only feed file slots.`,
    };
  }
  return undefined;
}

/**
 * The issue an `outputs.<id>.<key>` reference raises, or `undefined` when it
 * resolves: a missing producer, a producer that isn't an upstream ancestor of
 * `referencingNodeId`, or a `<key>` the producer's tool doesn't declare (skipped
 * when the tool's outputs aren't loaded).
 */
function classifyOutputReference(
  ref: Reference,
  referencingNodeId: string,
  ctx: OutputScanContext
): BuilderNodeIssue | undefined {
  const producer = ref.key ?? "";
  if (!ctx.nodeIds.has(producer)) {
    return {
      code: "DANGLING_OUTPUT_REFERENCE",
      message: `References output of missing step "${producer}".`,
    };
  }
  if (!ctx.descendants(producer).has(referencingNodeId)) {
    return {
      code: "UNORDERED_OUTPUT_REFERENCE",
      message: `Step "${producer}" is not an upstream dependency; add an edge so its output is available.`,
    };
  }
  if (ctx.getToolOutputs) {
    const declared = ctx.getToolOutputs(
      ctx.nodeById.get(producer)?.data.toolName
    );
    if (declared && !declared.some((o) => o.key === ref.outputKey)) {
      return {
        code: "UNKNOWN_OUTPUT_REFERENCE",
        message: ref.outputKey
          ? `Step "${producer}" declares no output "${ref.outputKey}".`
          : `Reference to step "${producer}" is missing an output key.`,
      };
    }
  }
  return undefined;
}

/**
 * Flag references whose target can't resolve: an `outputs.<id>` whose producer is
 * missing or not a transitive ancestor of the referencing node, an `outputs.<id>`
 * whose `<key>` isn't a declared output of the producer's tool, or an
 * `inputs.<key>` that isn't declared. Scans every reference-carrying surface of a
 * node — the `command` string and each `fileBindings` value (same `${…}` grammar)
 * — and knows which surface a token came from, so it also flags kind mismatches:
 * a `fileBindings` value referencing a declared input that isn't `file`-kind
 * (`NON_FILE_INPUT_IN_SLOT`, e.g. the author changed the input's type after
 * binding) and a `command` referencing a `file`-kind input (`FILE_INPUT_IN_ARG`
 * — a file_id in a text arg is a footgun the picker prevents but hand-edited
 * definitions won't). Returns issues keyed by *referencing* node id, shaped for
 * the existing `issues` ring / `mapIssuesToNodes` machinery.
 *
 * `getToolOutputs` resolves a producer tool's declared outputs; when it returns
 * `undefined` (tool not in the registry yet) the unknown-key check is skipped so
 * we never over-flag on an unloaded registry.
 *
 * Add-only edges + strict-mode backend means we surface, never block.
 */
export function collectDanglingReferences(
  nodes: ReadonlyArray<ReferencingNode>,
  edges: ReadonlyArray<DependencyEdge>,
  inputs: ReadonlyArray<WorkflowInputField>,
  getToolOutputs?: (
    toolName: string | undefined
  ) => ReadonlyArray<DeclaredOutput> | undefined
): Map<string, BuilderNodeIssue[]> {
  const issues = new Map<string, BuilderNodeIssue[]>();
  const declaredInputs = new Map(inputs.map((i) => [i.key, i]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const nodeIds = new Set(nodes.map((n) => n.id));
  // Memoize descendants per producer so a fan-in node isn't recomputed.
  const descendantsOf = new Map<string, Set<string>>();
  const descendants = (id: string) => {
    let set = descendantsOf.get(id);
    if (!set) {
      set = collectDescendants(id, edges);
      descendantsOf.set(id, set);
    }
    return set;
  };

  const push = (nodeId: string, issue: BuilderNodeIssue) => {
    const list = issues.get(nodeId) ?? [];
    list.push(issue);
    issues.set(nodeId, list);
  };

  const outputCtx: OutputScanContext = {
    nodeIds,
    descendants,
    nodeById,
    getToolOutputs,
  };

  for (const node of nodes) {
    // Scan per surface: input-kind rules differ between a command arg and a
    // file-slot binding, so the flattened all-texts list isn't enough.
    const surfaces: Array<{ text: string; isSlot: boolean }> = [
      ...(node.data.command
        ? [{ text: node.data.command, isSlot: false }]
        : []),
      ...Object.values(node.data.fileBindings ?? {})
        .filter((text): text is string => Boolean(text))
        .map((text) => ({ text, isSlot: true })),
    ];
    for (const { text, isSlot } of surfaces) {
      for (const ref of parseReferences(text)) {
        const issue =
          ref.kind === "input"
            ? classifyInputReference(ref, isSlot, declaredInputs)
            : ref.kind === "output"
              ? classifyOutputReference(ref, node.id, outputCtx)
              : undefined;
        if (issue) push(node.id, issue);
      }
    }
  }

  return issues;
}
