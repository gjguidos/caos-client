/**
 * parseCommandToValues — the true inverse of `serializeUIComponents`.
 *
 * `parseToolCommand.ts` keys flags by component id for display, but it doesn't
 * coerce types (it stringifies everything) or preserve `${…}` reference tokens,
 * so it can't seed editable values. This one coerces by `component.type` and keeps
 * references intact, so the builder can load an existing workflow's `command` back
 * into the panel and re-serialize it unchanged.
 */

import type {
  ChatInputConfig,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { parseFlags } from "@/app/(workspace)/_tool-form/lib/parseFlags";

/**
 * Coerce a raw flag string back into the component's typed value.
 *
 * A value containing a `${…}` reference token is kept as a **raw string** and
 * skips coercion entirely — otherwise `${inputs.tags}` on a multiselect would be
 * `split(",")`-mangled and `${inputs.n}` on a number would be `NaN`-checked. The
 * reference is just an opaque flag value that round-trips unchanged.
 *
 * `multiselect` splits on `,` (the serializer's join char), so a value that
 * itself contains a comma cannot round-trip — acceptable given the flag grammar.
 * A non-numeric `number` flag falls back to the raw string rather than `NaN`.
 */
function coerce(
  raw: string,
  type: UIComponent["type"]
): string | number | string[] {
  if (raw.includes("${")) return raw;
  if (type === "multiselect") return raw.split(",");
  if (type === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  return raw;
}

export function parseCommandToValues(
  command: string,
  components: UIComponent[],
  chatInputConfig: ChatInputConfig | null
): FormValues {
  const flagValues = parseFlags(command);
  const values: FormValues = {};

  for (const component of components) {
    const flag = component.flag_config?.flag;
    if (!flag) continue;
    const raw = flagValues[flag];
    if (raw === undefined) continue;
    values[component.id] = coerce(raw, component.type);
  }

  if (chatInputConfig) {
    const raw = flagValues[chatInputConfig.flag];
    if (raw !== undefined && values[chatInputConfig.id] === undefined) {
      values[chatInputConfig.id] = raw;
    }
  }

  return values;
}
