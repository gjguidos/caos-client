import type {
  ActionButtonLabels,
  ActionButtonStatus,
  ButtonVariant,
} from "@/app/(workspace)/_tool-form/components/fields/ActionButtonField";
import type { ReactNode } from "react";

import type {
  SearchBehaviorConfig,
  ToolFeaturePanel,
} from "@/app/(workspace)/_types/chat.types";

export type FieldType =
  | "select"
  | "free_text"
  | "text"
  | "number"
  | "multiselect"
  | "boolean"
  | "action"
  | "hidden"
  | "object"
  | "file";

export type WidgetType =
  | "PillGroup"
  | "ResponseActionBar"
  | "TextField"
  | "TextArea"
  | "NumberField"
  | "SelectField"
  | "CheckboxGroupField"
  | "SwitchField"
  | "ComboBoxField"
  | "HiddenField"
  | "ActionButton"
  | "JsonField"
  | "FileField";

export type UIConditionOperator =
  | "empty"
  | "not_empty"
  | "equals"
  | "not_equals"
  | "in"
  | "not_in";

export type FieldCondition = UICondition;

export type UICondition =
  | {
      field: string;
      state?: never;
      operator: UIConditionOperator;

      value?: FormScalarValue | FormScalarValue[];

      message?: string;
    }
  | {
      state: string;
      field?: never;
      operator: UIConditionOperator;

      value?: FormScalarValue | FormScalarValue[];

      message?: string;
    };

export interface ToolOperationHttpAction {
  type: "http_request";

  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  endpoint: string;

  path_params?: Record<
    string,
    {
      from_state?: string;
      value?: string | number | boolean;
    }
  >;
}

export interface ToolOperationBinding {
  source: string;
  kind: string;

  run_id_state: string;
  status_state: string;

  running_statuses?: string[];
  stopping_statuses?: string[];
  terminal_statuses?: string[];

  events?: {
    started?: string;
    progress?: string;
    completed?: string;
    failed?: string;
    cancelled?: string;
  };

  actions?: {
    cancel?: ToolOperationHttpAction;
  };
}

export interface FieldOption {
  value: string;
  label?: string;
  /** When false, no text input is required to submit */
  requiresInput?: boolean;
}

export interface BaseWidgetProps {
  label?: string;
  placeholder?: string;
  helperText?: string;
  description?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  defaultValue?: FormValue;
}

export interface BaseFieldConfig {
  key: string;
  type: FieldType;
  widget: WidgetType;
  label: string;

  placeholder?: string;
  helperText?: string;
  description?: string;

  required?: boolean;
  disabled?: boolean;
  disabledWhen?: FieldCondition[];
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text" | "free_text";
  widget: "TextField" | "TextArea";
  file_upload?: boolean;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  widget: "NumberField";
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  widget: "SelectField" | "ComboBoxField" | "PillGroup";
  options: FieldOption[];
}

export interface MultiselectFieldConfig extends BaseFieldConfig {
  type: "multiselect";
  widget: "CheckboxGroupField";
  options: FieldOption[];
}

export interface BooleanFieldConfig extends BaseFieldConfig {
  type: "boolean";
  widget: "SwitchField";
}

export interface ActionFieldConfig extends BaseFieldConfig {
  type: "action";
  widget: "ActionButton";

  description?: string;
  helperText?: string;
  variant?: ButtonVariant;
  disabled?: boolean;

  status?: ActionButtonStatus;
  statusMessage?: string;
  labels?: ActionButtonLabels;
}

export interface OutputProfileOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * One profile's payload. Field defaults arrive either flat on the entry or
 * nested under `defaults` next to a `preview` block; read them through
 * `getProfileDefaults` rather than indexing either spelling directly.
 */
export interface OutputProfileEntry {
  defaults?: Record<string, FormValue>;
  preview?: Record<string, unknown>;
  [field: string]: unknown;
}

export interface OutputProfilesConfig {
  /**
   * Form field holding the selected profile key. Defaults to `output_profile`
   * so the form state layer never has to hard-code a tool's field name.
   */
  field?: string;
  default?: string;
  controlled_fields?: string[];
  profiles?: Record<string, OutputProfileEntry>;
  options?: OutputProfileOption[];
  apply_values?: boolean;
  respect_user_overrides?: boolean;
  /**
   * Fields to surface in a profile's summary line, in display order. Omit to
   * summarise every key the profile's `preview` block carries.
   */
  preview_fields?: string[];
}

export interface HiddenFieldConfig extends BaseFieldConfig {
  type: "hidden";
  widget: "HiddenField";
}

/**
 * Structured (JSON) input. The value rides through form state as raw JSON *text*
 * (a `string`), so it needs no change to `FormValues` or the CLI serializer; the
 * consuming tool's `object`/`array` param parses it back into a real dict/list.
 */
export interface JsonFieldConfig extends BaseFieldConfig {
  type: "object";
  widget: "JsonField";
}

/**
 * File-pick input. The value rides through form state as the uploaded file's
 * opaque `file_id` *string* (same trick `JsonField` uses for raw JSON text), so
 * `FormValues` and the CLI serializer need no change. The widget uploads eagerly
 * on pick via `POST /v1/files` against `uploadTarget` (a workflow key).
 */
export interface FileFieldConfig extends BaseFieldConfig {
  type: "file";
  widget: "FileField";
  /** Advisory mime filter (may use `type/*` wildcards); absent/empty = any. */
  acceptedMimes?: string[];
  /** Workflow key the upload is scoped to (`target_workflow`). */
  uploadTarget?: string;
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | SelectFieldConfig
  | MultiselectFieldConfig
  | BooleanFieldConfig
  | ActionFieldConfig
  | HiddenFieldConfig
  | JsonFieldConfig
  | FileFieldConfig;

export type FormScalarValue = string | number | boolean;

export type FormValue = string | number | boolean | string[] | undefined;

export type FormValues = Record<string, FormValue>;

export interface BaseFieldProps {
  id: string;
  label: string;
  value: FormValue;
  onChange: (value: FormValue) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface TextFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  value: string | undefined;
  onChange: (value: string) => void;
}

export interface TextareaFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  value: string | undefined;
  onChange: (value: string) => void;
  fileUpload?: boolean;
}

export interface NumberFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string | null;
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  value: string | undefined;
  onChange: (value: string) => void;
  options: FieldOption[];
}

export interface CheckboxGroupFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  options: FieldOption[];
}

export interface SwitchFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface JsonFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  /** Raw JSON text. */
  value: string | undefined;
  onChange: (value: string) => void;
}

export interface FileFieldProps extends Omit<
  BaseFieldProps,
  "value" | "onChange"
> {
  /** The uploaded file's opaque `file_id`, or undefined when nothing is picked. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  acceptedMimes?: string[];
  uploadTarget?: string;
}

export interface FieldRendererProps {
  config: FieldConfig;
  value: FormValue;
  onChange: (key: string, value: FormValue) => void;
  onAction?: () => void | Promise<void>;
}

export type ToolAdvancedSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  components: UIComponent[];
  values: FormValues;

  inferredValues?: Record<string, FormValue>;
  inferredReports?: string[];

  onValueChange: (key: string, value: FormValue) => void;

  profileConfig?: OutputProfilesConfig | null;
  selectedProfile?: string;

  hiddenFieldIds?: string[];
  includeGroups?: string[];
  excludeGroups?: string[];

  title?: string;
  description?: string;
};

export interface DynamicFormRendererProps {
  uiComponents?: UIComponent[];
  groupLabelMap?: Record<string, string>;
  values: FormValues;
  onChange: (key: string, value: FormValue) => void;

  onAction?: (component: UIComponent) => void | Promise<void>;
  actionStatuses?: Record<string, ActionButtonStatus>;
  actionMessages?: Record<string, string | undefined>;

  /**
   * Optional per-field render override. The chat path passes nothing and renders
   * `defaultField` (byte-identical). The builder passes a wrapper that adds the
   * binding chrome (chain toggle + bound reference control). The renderer itself
   * stays ignorant of references — it only hands over the typed widget it would
   * otherwise have rendered.
   */
  renderField?: (args: {
    component: UIComponent;
    value: FormValue;
    onChange: (key: string, value: FormValue) => void;
    defaultField: ReactNode;
  }) => ReactNode;
  defaultCollapsed?: boolean;
}

export type RenderPath =
  | "workspace.conversationArea.inputSection.toolMode"
  | "workspace.conversationArea.responseCard.responseActionBar"
  | "workspace.conversationArea.inputSection.inputActionBar"
  | `propertiesPanel.${string}`
  | string; // Allow other custom paths

export interface PillGroupProps {
  options: FieldOption[];
  default?: string;
}

export interface FlagConfig {
  flag: string;
  required: boolean;
}

export interface ToolUIConfig {
  group_label_map?: Record<string, string>;
  chat_input?: ChatInputConfig;
  output_profiles?: OutputProfilesConfig;
  search_behavior?: SearchBehaviorConfig;
  feature_panels?: ToolFeaturePanel[];

  operation_binding?: ToolOperationBinding;
}

export interface UIComponent {
  id: string;
  type: FieldType;
  widget: WidgetType;

  hidden?: boolean;

  group: string | null;

  /** Overrides group_label_map for this component's group section header */
  groupLabel?: string;

  flag_config?: FlagConfig;

  render_paths: RenderPath[];

  slot_order: number | null;

  props: Record<string, unknown>;

  /** Enable file upload for this component */
  file_upload?: boolean;

  /** Controls whether this component should be rendered */
  visible_when?: UICondition;

  /** Conditions that disable this component */
  disabled_when?: UICondition[];
}

export interface UIExample {
  id: string;
  label: string;
  description: string;
  mode: string;
  params: Record<string, string | number | boolean | string[]>;
}

export interface ChatInputConfig {
  id: string;
  placeholder?: string;
  file_upload?: boolean;
  flag: string;
  required: boolean;
}
