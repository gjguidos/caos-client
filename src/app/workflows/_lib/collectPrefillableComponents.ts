/**
 * collectPrefillableComponents — registry-free adapter that flattens a tool's
 * `ui.components` + `ui.config.chat_input` into the `UIComponent[]` the builder's
 * config panel feeds to `DynamicFormRenderer`.
 *
 * In chat the primary input is the message box and the mode is a pill; in the
 * builder every serializable arg is just a panel field. So we:
 *  - rewrite the `@`-flagged mode `PillGroup` into a `SelectField` (no new widget),
 *  - synthesize a field for the chat-input from `chat_input`,
 *  - drop both into a synthetic leading "Input" group (components need a non-null
 *    `group` or `DynamicFormRenderer` skips them, and a low `slot_order` so they
 *    sort first),
 *  - pass real `propertiesPanel.*` components through untouched.
 *
 * The returned `chatInputConfig` is handed to `serializeUIComponents` on the
 * write-back path; it dedupes the chat-input flag (the synthetic component shares
 * its flag) so exactly one flag is emitted.
 */

import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import type {
  ChatInputConfig,
  FieldOption,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { findModeComponent } from "@/app/(workspace)/_tool-form/lib/toolDisplayShared";

/** Group + slot ordering for the synthetic leading "Input" section. */
export const INPUT_GROUP = "propertiesPanel.input";
const CHAT_INPUT_SLOT_ORDER = -2;
const MODE_SLOT_ORDER = -1;

export interface PrefillableComponents {
  components: UIComponent[];
  chatInputConfig: ChatInputConfig | null;
  groupLabelMap: Record<string, string>;
}

/** Rewrite the `@`-flagged mode pill into a single-select field. */
function modePillToSelectField(component: UIComponent): UIComponent {
  return {
    ...component,
    type: "select",
    widget: "SelectField",
    group: INPUT_GROUP,
    slot_order: MODE_SLOT_ORDER,
  };
}

/** Synthesize a panel field from the tool's chat-input config. */
function chatInputToComponent(chatInput: ChatInputConfig): UIComponent {
  return {
    id: chatInput.id,
    type: "text",
    widget: "TextArea",
    group: INPUT_GROUP,
    flag_config: { flag: chatInput.flag, required: chatInput.required },
    render_paths: [],
    slot_order: CHAT_INPUT_SLOT_ORDER,
    props: { placeholder: chatInput.placeholder },
    file_upload: chatInput.file_upload,
  };
}

export function collectPrefillableComponents(
  tool: ToolDefinition
): PrefillableComponents {
  const source = tool.ui?.components ?? [];
  const chatInputConfig = tool.ui?.config?.chat_input ?? null;
  const modeComponent = findModeComponent(source);

  // Dedupe by id (first wins) so a backend payload that repeats a component id
  // — or a `chat_input.id` that collides with a real component — can't emit two
  // fields sharing a React key. Mirrors `serializeUIComponents`' `seenIds`, so
  // the panel and the serializer agree on exactly one field per id. The synthetic
  // chat-input is pushed first, so it wins over any raw source component reusing
  // its id.
  const components: UIComponent[] = [];
  const seenIds = new Set<string>();
  const push = (component: UIComponent) => {
    if (seenIds.has(component.id)) return;
    seenIds.add(component.id);
    components.push(component);
  };

  if (chatInputConfig) {
    push(chatInputToComponent(chatInputConfig));
  }

  for (const component of source) {
    push(
      component.id === modeComponent?.id
        ? modePillToSelectField(component)
        : component
    );
  }

  const groupLabelMap: Record<string, string> = {
    [INPUT_GROUP]: "Input",
    ...(tool.ui?.config?.group_label_map ?? {}),
  };

  return { components, chatInputConfig, groupLabelMap };
}

/** Resolve the human label of the currently-selected mode option, if any. */
export function resolveModeLabel(
  tool: ToolDefinition,
  values: { [key: string]: unknown } | undefined
): string | undefined {
  const modeComponent = findModeComponent(tool.ui?.components ?? []);
  if (!modeComponent || !values) return undefined;
  const value = values[modeComponent.id];
  if (typeof value !== "string" || value === "") return undefined;
  const options =
    (modeComponent.props?.options as FieldOption[] | undefined) ?? [];
  return options.find((o) => o.value === value)?.label ?? value;
}
