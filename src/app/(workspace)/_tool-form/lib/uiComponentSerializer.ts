import type {
  ChatInputConfig,
  FormValue,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

export function isEmptyValue(value: FormValues[string]): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function needsQuotes(value: string): boolean {
  return /[\s"']/.test(value);
}

function escapeQuotes(value: string): string {
  return value.replace(/"/g, '\\"');
}

function formatValue(value: string | number | string[]): string {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  const stringValue = String(value);

  if (needsQuotes(stringValue)) {
    return `"${escapeQuotes(stringValue)}"`;
  }

  return stringValue;
}

/**
 * Serializes form values using UI components with flag_config.
 *
 * A tool fires only when the message contains its canonical key prefixed with
 * `@` (e.g. `@writer`). Every component serializes through its own
 * `flag_config.flag` — the mode pill is just a `--mode` flag like any other
 * (the backend resolves unknown mode values to the tool's default).
 *
 * Example:
 * toolKey: "writer"
 * Components:
 * - { id: "mode", flag_config: { flag: "--mode", required: true } }
 * - { id: "text", flag_config: { flag: "--text", required: true } }
 * - { id: "tone_of_voice", flag_config: { flag: "--tone_of_voice", required: false } }
 *
 * Values: { mode: "rewrite", text: "a story", tone_of_voice: ["clear", "curious"] }
 *
 * Returns: "@writer --mode=rewrite --text="a story" --tone_of_voice=clear,curious"
 */
export function serializeUIComponents(
  values: FormValues,
  components: UIComponent[],
  chatInputConfig?: ChatInputConfig | null,
  toolKey?: string | null
): string {
  // Flags are emitted in component order, then the chat input last. The backend
  // parses by flag name, so order is for readability only.
  const parts: string[] = [];
  const seenIds = new Set<string>();
  const seenFlags = new Set<string>();

  for (const component of components) {
    if (!component.flag_config) continue;

    const { flag } = component.flag_config;

    // Skip UIComponents whose flag is handled by chatInputConfig.
    // The chatInputConfig block below will read either:
    // - values[chatInputConfig.id]
    // - or values[component.id] for the component that owns the same flag.
    if (chatInputConfig && flag === chatInputConfig.flag) {
      continue;
    }

    if (seenIds.has(component.id) || seenFlags.has(flag)) continue;

    seenIds.add(component.id);
    seenFlags.add(flag);

    const value = values[component.id];

    if (isEmptyValue(value)) {
      continue;
    }

    const formattedValue = formatValue(value as string | number | string[]);

    parts.push(`${flag}=${formattedValue}`);
  }

  if (chatInputConfig && !seenFlags.has(chatInputConfig.flag)) {
    const chatInputComponent = components.find(
      (component) => component.flag_config?.flag === chatInputConfig.flag
    );

    const valueFromChatInputId = values[chatInputConfig.id];
    const valueFromFlagComponent = chatInputComponent
      ? values[chatInputComponent.id]
      : undefined;

    const value = !isEmptyValue(valueFromChatInputId)
      ? valueFromChatInputId
      : valueFromFlagComponent;

    if (!isEmptyValue(value)) {
      const formattedValue = formatValue(value as string | number | string[]);
      parts.push(`${chatInputConfig.flag}=${formattedValue}`);
      seenFlags.add(chatInputConfig.flag);
    }
  }

  const tokenParts = toolKey ? [`@${toolKey}`] : [];

  return [...tokenParts, ...parts].join(" ");
}

export function hasRequiredUIComponentValues(
  values: FormValues,
  components: UIComponent[],
  chatInputConfig?: ChatInputConfig | null
): boolean {
  for (const component of components) {
    // Skip UIComponents whose flag is handled by chatInputConfig
    if (
      chatInputConfig &&
      component.flag_config?.flag === chatInputConfig.flag
    ) {
      continue;
    }

    if (!component.flag_config?.required) {
      continue;
    }

    const value = values[component.id];

    if (isEmptyValue(value)) {
      return false;
    }
  }

  if (chatInputConfig?.required && isEmptyValue(values[chatInputConfig.id])) {
    return false;
  }

  return true;
}

export function hasAnyUIComponentValues(
  values: FormValues,
  components: UIComponent[]
): boolean {
  return components.some((component) => !isEmptyValue(values[component.id]));
}

export function createEmptyUIComponentValues(
  components: UIComponent[],
  chatInputConfig?: ChatInputConfig | null
): FormValues {
  const values: FormValues = {};

  for (const component of components) {
    if (component.hidden) {
      const hiddenDefault = component.props?.defaultValue;

      if (hiddenDefault !== undefined) {
        values[component.id] = hiddenDefault as FormValue;
      }

      continue;
    }

    const defaultValue = component.props?.defaultValue;

    if (defaultValue !== undefined) {
      values[component.id] = defaultValue as FormValue;
      continue;
    }

    switch (component.type) {
      case "boolean":
        values[component.id] = false;
        break;

      case "multiselect":
        values[component.id] = [];
        break;

      case "number": {
        const { max } = component.props as { max?: number };
        values[component.id] = max;
        break;
      }

      default:
        values[component.id] = undefined;
        break;
    }
  }

  if (chatInputConfig?.id && !(chatInputConfig.id in values)) {
    values[chatInputConfig.id] = undefined;
  }

  return values;
}

/**
 * Computes form values to apply after a successful submission.
 *
 * Post-submit reset policy:
 *  - CLEAR  — chatInputConfig.id (the textarea). Always wiped so the next message starts blank.
 *  - KEEP   — all UIComponents (panel fields, mode pills). Users rarely change these between messages.
 */
export function createPostSubmitValues(
  components: UIComponent[],
  currentValues: FormValues,
  chatInputConfig?: ChatInputConfig | null
): FormValues {
  const result: FormValues = {};

  for (const component of components) {
    result[component.id] = currentValues[component.id];
  }

  if (chatInputConfig) {
    result[chatInputConfig.id] = undefined;
  }

  return result;
}
