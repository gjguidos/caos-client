/**
 * inputUsage — the reverse index behind the canvas's input nodes and the
 * Used-by list: for each declared workflow input, exactly which field of which
 * step consumes it.
 *
 * The forward direction ("what is this arg bound to?") is already owned by
 * `classifyStepArgs`; this walks the same classified args rather than adding a
 * second command walker, so the two can never disagree on what a command means.
 * `fileBindings` aren't covered by `classifyStepArgs` and are scanned here.
 *
 * Matching is on `key` alone. Two inputs declared with the same `key` therefore
 * both report the same usages — a faithful picture of a broken workflow.
 *
 * Pure: no React Flow imports, unit-testable on plain objects.
 */

import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import {
  isWholeReference,
  parseReferences,
} from "@/shared/lib/workflow/references";
import { fileSlotLabel } from "./fileSlots";
import { classifyStepArgs } from "./stepArgs";

/** Where inside a step an input is consumed. */
export type UsageTarget =
  | { kind: "arg"; componentId: string }
  | { kind: "slot"; slotName: string };

export interface InputUsage {
  /** The referenced `inputs.<key>`. */
  inputKey: string;
  stepId: string;
  stepLabel: string;
  target: UsageTarget;
  /** Human-facing field label (component label / slot label, falling back to the id). */
  fieldLabel: string;
  /**
   * True when the field's value is exactly one `${…}` token. False when the
   * token is embedded in a larger string — such a field can be *shown* but must
   * not be offered an unlink, since clearing it would wipe the surrounding text.
   */
  whole: boolean;
}

/** The minimal node shape the usage scan reads. */
export interface UsageScanNode {
  id: string;
  data: {
    stepType: string;
    label: string;
    command?: string;
    toolName?: string;
    fileBindings?: Record<string, string>;
  };
}

/**
 * Every `${inputs.<key>}` consumption across the graph, in node order, then arg
 * order, then slot order — stable, so the panel list does not jump. Non-tool
 * steps and unresolvable tools contribute nothing.
 */
export function collectInputUsage(
  nodes: ReadonlyArray<UsageScanNode>,
  getTool: (toolName: string | undefined) => ToolDefinition | undefined
): InputUsage[] {
  const usages: InputUsage[] = [];

  for (const node of nodes) {
    if (node.data.stepType !== "tool") continue;
    const tool = getTool(node.data.toolName);
    if (!tool) continue;
    const stepLabel = node.data.label;

    for (const arg of classifyStepArgs(tool, node.data.command ?? "")) {
      const seenInputKeys = new Set<string>();
      for (const ref of arg.references) {
        if (ref.kind !== "input") continue;
        const inputKey = ref.key?.trim();
        if (!inputKey) continue;
        if (seenInputKeys.has(inputKey)) continue;
        seenInputKeys.add(inputKey);
        usages.push({
          inputKey,
          stepId: node.id,
          stepLabel,
          target: { kind: "arg", componentId: arg.componentId },
          fieldLabel: arg.field,
          whole: arg.kind === "binding",
        });
      }
    }

    const slots = tool.supports?.files?.slots ?? [];
    for (const [slotName, value] of Object.entries(
      node.data.fileBindings ?? {}
    )) {
      if (!value) continue;
      const slot = slots.find((s) => s.name === slotName);
      const seenInputKeys = new Set<string>();
      for (const ref of parseReferences(value)) {
        if (ref.kind !== "input") continue;
        const inputKey = ref.key?.trim();
        if (!inputKey) continue;
        if (seenInputKeys.has(inputKey)) continue;
        seenInputKeys.add(inputKey);
        usages.push({
          inputKey,
          stepId: node.id,
          stepLabel,
          target: { kind: "slot", slotName },
          fieldLabel: slot ? fileSlotLabel(slot) : slotName,
          whole: isWholeReference(value),
        });
      }
    }
  }

  return usages;
}

/**
 * Group usages by the input key they reference. The panel's Used-by list and the
 * node's usage count both read this, so they cannot disagree.
 */
export function groupUsageByInputKey(
  usages: ReadonlyArray<InputUsage>
): Map<string, InputUsage[]> {
  const byKey = new Map<string, InputUsage[]>();
  for (const usage of usages) {
    const list = byKey.get(usage.inputKey);
    if (list) list.push(usage);
    else byKey.set(usage.inputKey, [usage]);
  }
  return byKey;
}
