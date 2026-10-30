/**
 * Extractors that pull the attached workflow keys off an agent and the workflow
 * spec out of a workflow catalog response.
 *
 * `GET /v1/workflows/key/{key}` returns a flat `WorkflowDocument`
 * (`{ key, name, definition, inputs, ui, ... }`) — the former `WorkflowSpec`
 * plus audit fields, no `data.metadata` envelope. We read the spec at the top
 * level and use only the `definition` and `inputs` the frontend renders.
 */

import type {
  FieldOption,
  FieldType,
  UIComponent,
  WidgetType,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import type { WorkflowDefinition } from "@/shared/lib/workflow/workflow.types";
import { readAcceptedMimes } from "@/shared/lib/workflow/workflowInputs";

/** Group declared run inputs under one section in the Run panel form. */
export const RUN_INPUT_GROUP = "inputs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read the workflow catalog keys attached to an agent. */
export function getWorkflowKeysFromAgent(
  agent: { workflows?: string[] } | null | undefined
): string[] {
  const keys = agent?.workflows;
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is string => typeof key === "string" && !!key);
}

/** The WorkflowDocument is returned flat — the spec is the response itself. */
function getWorkflowSpec(response: unknown): Record<string, unknown> | null {
  return isRecord(response) ? response : null;
}

/** Read the workflow definition (`{ steps, ... }`) from the WorkflowDocument. */
export function extractWorkflowDefinition(
  response: unknown
): WorkflowDefinition | null {
  const definition = getWorkflowSpec(response)?.definition;
  if (isRecord(definition) && Array.isArray(definition.steps)) {
    return definition as unknown as WorkflowDefinition;
  }
  return null;
}

/** One declared input as serialized by the backend `WorkflowInputField`. */
interface WorkflowInputField {
  key: string;
  label?: string;
  /** text | textarea | number | select | multiselect | object | file */
  input?: string;
  required?: boolean;
  help?: string | null;
  constraints?: Record<string, unknown> | null;
  options?: Array<Record<string, unknown>> | null;
}

function toOptions(
  options: Array<Record<string, unknown>> | null | undefined
): FieldOption[] | undefined {
  if (!Array.isArray(options) || options.length === 0) return undefined;
  const mapped: FieldOption[] = [];
  for (const o of options) {
    if (!isRecord(o)) continue;
    const value = o.value ?? o.id;
    if (value === undefined || value === null) continue;
    mapped.push({
      value: String(value),
      label: String(o.label ?? o.name ?? value),
    });
  }
  return mapped.length > 0 ? mapped : undefined;
}

/** Map a backend `input` type to a renderable widget + field type. */
function resolveWidget(input: string | undefined): {
  widget: WidgetType;
  type: FieldType;
} {
  switch (input) {
    case "textarea":
      return { widget: "TextArea", type: "text" };
    case "number":
      return { widget: "NumberField", type: "number" };
    case "multiselect":
      return { widget: "CheckboxGroupField", type: "multiselect" };
    case "object":
      return { widget: "JsonField", type: "object" };
    case "select":
      return { widget: "SelectField", type: "select" };
    case "file":
      return { widget: "FileField", type: "file" };
    default:
      return { widget: "TextField", type: "text" };
  }
}

export function inputFieldToUIComponent(
  field: WorkflowInputField,
  index: number,
  workflowKey: string | undefined
): UIComponent {
  const { widget, type } = resolveWidget(field.input);

  const options = toOptions(field.options);

  const props: Record<string, unknown> = { label: field.label ?? field.key };
  if (field.help) props.placeholder = field.help;
  if (options) props.options = options;
  if (widget === "NumberField" && isRecord(field.constraints)) {
    const { min, max } = field.constraints;
    if (typeof min === "number") props.min = min;
    if (typeof max === "number") props.max = max;
  }
  if (widget === "FileField") {
    const acceptedMimes = readAcceptedMimes(field.constraints);
    if (acceptedMimes) props.acceptedMimes = acceptedMimes;
    // The Run-panel upload is scoped to the workflow (`target_workflow`).
    if (workflowKey) props.uploadTarget = workflowKey;
  }

  return {
    id: field.key,
    type,
    widget,
    group: RUN_INPUT_GROUP,
    flag_config: { flag: `--${field.key}`, required: field.required === true },
    render_paths: [],
    slot_order: index,
    props,
  };
}

/**
 * Extract the workflow's declared run inputs (`WorkflowInputField[]`) as
 * UIComponents for the Run form. Returns `[]` when the workflow declares none.
 */
export function extractWorkflowInputs(response: unknown): UIComponent[] {
  const spec = getWorkflowSpec(response);
  const inputs = spec?.inputs;
  if (!Array.isArray(inputs)) return [];
  const workflowKey = typeof spec?.key === "string" ? spec.key : undefined;
  return inputs
    .filter(
      (f): f is WorkflowInputField => isRecord(f) && typeof f.key === "string"
    )
    .map((field, index) => inputFieldToUIComponent(field, index, workflowKey));
}
