/**
 * validateRequiredInputs — save-time client check (Phase 3).
 *
 * Before POSTing, flag every tool step that still has unset required args, so the
 * author gets the same error rings as the backend `422` mapping without a round
 * trip. Built on the shared, pure `classifyStepArgs`; the backend stays
 * the authoritative layer (`mapIssuesToNodes`). Structural steps and unresolved
 * tools are skipped (the latter already surface their own "tool unavailable" hint).
 */

import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type { BuilderNodeData, BuilderNodeIssue } from "./builderGraph";
import { classifyStepArgs } from "./stepArgs";
import { findByKey } from "@/store/slices/registry/registryEntry";

/** Minimal node shape the scan needs (a subset of the builder RF node). */
interface ValidatableNode {
  id: string;
  data: BuilderNodeData;
}

/**
 * Map each tool node with unset required args to a single aggregate issue keyed by
 * node id, shaped for the existing `issues` ring machinery. Empty map ⇒ all good.
 */
export function validateRequiredInputs(
  nodes: ReadonlyArray<ValidatableNode>,
  tools: ReadonlyArray<ToolDefinition>
): Map<string, BuilderNodeIssue[]> {
  const byNode = new Map<string, BuilderNodeIssue[]>();

  for (const node of nodes) {
    if (node.data.stepType !== "tool") continue;
    const tool = findByKey(tools, node.data.toolName);
    if (!tool) continue;

    const missing = classifyStepArgs(tool, node.data.command ?? "").filter(
      (arg) => arg.kind === "missingRequired"
    );
    if (missing.length === 0) continue;

    byNode.set(node.id, [
      {
        code: "MISSING_REQUIRED_INPUT",
        message: `Set required input${missing.length > 1 ? "s" : ""}: ${missing
          .map((m) => m.field)
          .join(", ")}.`,
      },
    ]);
  }

  return byNode;
}
