import type {
  ActionButtonLabels,
  ButtonVariant,
} from "@/app/(workspace)/_tool-form/components/fields/ActionButtonField";
import type {
  BaseWidgetProps,
  FieldConfig,
  FieldOption,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

export interface ComponentProps extends BaseWidgetProps {
  min?: number;
  max?: number;
  step?: number;
  options?: FieldOption[];
  acceptedMimes?: string[];
  uploadTarget?: string;
  description?: string;
  helperText?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  action?: {
    labels?: ActionButtonLabels;
    [key: string]: unknown;
  };
}

function mapOptions(options: FieldOption[] | undefined) {
  return (
    options?.map((option) => ({
      value: option.value,
      label: option.label ?? option.value,
    })) ?? []
  );
}

/**
 * Normalize a registry `UIComponent` into the `FieldConfig` that `FieldRenderer`
 * consumes. Single conversion point: every surface that renders tool fields goes
 * through here, so a widget added to `WidgetType` is wired up in one place.
 *
 * Returns `"unimplemented"` for widgets with no renderer yet, so callers can
 * show a placeholder rather than silently dropping the field.
 */
export function uiComponentToFieldConfig(
  component: UIComponent
): FieldConfig | "unimplemented" | null {
  const props = component.props as ComponentProps;
  const label = props?.label ?? "";
  const placeholder = props?.placeholder ?? "";

  const baseConfig = {
    key: component.id,
    label,
    placeholder,
    helperText:
      typeof props?.helperText === "string" ? props.helperText : undefined,
    required: component.flag_config?.required || false,
    disabledWhen: component.disabled_when ?? [],
  };

  switch (component.widget) {
    case "HiddenField":
      return null;

    case "ActionButton":
      return {
        ...baseConfig,
        type: "action" as const,
        widget: "ActionButton" as const,
        description:
          typeof props.description === "string" ? props.description : undefined,
        variant: typeof props.variant === "string" ? props.variant : undefined,
        disabled:
          typeof props.disabled === "boolean" ? props.disabled : undefined,
      };

    case "TextField":
    case "TextArea":
      return {
        ...baseConfig,
        type: "text" as const,
        widget: component.widget,
        file_upload: component.file_upload || false,
      };

    case "NumberField":
      return {
        ...baseConfig,
        type: "number" as const,
        widget: component.widget,
        min: props?.min,
        max: props?.max,
        step: props?.step,
      };

    // ComboBoxField renders as a select; its free-text affordance is not
    // modelled yet, so the option list is what the user picks from.
    case "SelectField":
    case "ComboBoxField":
      return {
        ...baseConfig,
        type: "select" as const,
        widget: "SelectField" as const,
        options: mapOptions(props?.options),
      };

    case "CheckboxGroupField":
      return {
        ...baseConfig,
        type: "multiselect" as const,
        widget: component.widget,
        options: mapOptions(props?.options),
      };

    case "SwitchField":
      return {
        ...baseConfig,
        type: "boolean" as const,
        widget: component.widget,
      };

    case "JsonField":
      return {
        ...baseConfig,
        type: "object" as const,
        widget: component.widget,
      };

    case "FileField":
      return {
        ...baseConfig,
        type: "file" as const,
        widget: component.widget,
        acceptedMimes: props?.acceptedMimes,
        uploadTarget: props?.uploadTarget,
      };

    default:
      return "unimplemented";
  }
}
