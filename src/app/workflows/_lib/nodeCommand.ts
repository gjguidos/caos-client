/**
 * nodeCommand — interpret a tool node's `command` through its tool spec.
 *
 * A tool node's `command` string is the single source of truth (no cached
 * `values` on the node). Reading it for display and writing one edit back both
 * route through the same `collectPrefillableComponents` → `parseCommandToValues`
 * (and, on write, `serializeUIComponents`) round-trip, so the canvas node, the
 * config panel, and the hook can't drift on how a command is interpreted.
 */

import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type {
  FormValue,
  FormValues,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { serializeUIComponents } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import { collectPrefillableComponents } from "./collectPrefillableComponents";
import { parseCommandToValues } from "./parseCommandToValues";

/** Parse a tool node's `command` into editable, id-keyed, typed prefill values. */
export function nodeCommandToValues(
  tool: ToolDefinition,
  command: string
): FormValues {
  const { components, chatInputConfig } = collectPrefillableComponents(tool);
  return parseCommandToValues(command, components, chatInputConfig);
}

/**
 * Apply a single prefill edit to a tool node's `command` and re-serialize.
 * The command is the source of truth: parse it back to values, set one key, and
 * serialize — no cached `values` to keep coherent.
 */
export function setNodeCommandValue(
  tool: ToolDefinition,
  command: string,
  key: string,
  value: FormValue
): string {
  const { components, chatInputConfig } = collectPrefillableComponents(tool);
  const base = parseCommandToValues(command, components, chatInputConfig);
  return serializeUIComponents(
    { ...base, [key]: value },
    components,
    chatInputConfig,
    tool.key
  );
}
