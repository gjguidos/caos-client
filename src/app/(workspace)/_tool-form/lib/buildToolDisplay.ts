import type { ToolDisplayPayload } from "@/app/(workspace)/_types/chat.types";
import type {
  ChatInputConfig,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { isEmptyValue } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import {
  getComponentLabel,
  sortBySlotOrder,
} from "@/app/(workspace)/_tool-form/lib/toolDisplayShared";

function formatDisplayValue(value: string | number | string[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function buildToolDisplay(
  values: FormValues,
  components: UIComponent[],
  toolName: string,
  chatInputConfig?: ChatInputConfig | null
): ToolDisplayPayload {
  const fields: ToolDisplayPayload["fields"] = [];

  // The chat input is the message, so it leaves as `prompt` rather than as a
  // field labelled with a system word.
  const prompt =
    chatInputConfig && !isEmptyValue(values[chatInputConfig.id])
      ? formatDisplayValue(
          values[chatInputConfig.id] as string | number | string[]
        )
      : undefined;

  const seenIds = new Set<string>();
  if (chatInputConfig) seenIds.add(chatInputConfig.id);

  // Mode is not special — it has a flag_config like any other component, so it
  // is collected here as a regular field. Tools without a mode still produce a
  // display; the header is always just the tool name.
  const paramComponents = sortBySlotOrder(
    components.filter(
      (c) => !seenIds.has(c.id) && c.flag_config && !isEmptyValue(values[c.id])
    )
  );

  for (const component of paramComponents) {
    seenIds.add(component.id);
    fields.push({
      label: getComponentLabel(component),
      value: formatDisplayValue(
        values[component.id] as string | number | string[]
      ),
    });
  }

  return { toolName, prompt, fields };
}
