import type {
  BaseWidgetProps,
  FieldConfig,
  FieldOption,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

interface ComponentProps extends BaseWidgetProps {
  min?: number;
  max?: number;
  options?: FieldOption[];
  acceptedMimes?: string[];
  uploadTarget?: string;
}

function mapOptions(options: FieldOption[] | undefined) {
  return (
    options?.map((opt) => ({ value: opt.value, label: opt.label ?? "" })) ?? []
  );
}

/**
 * The typed field a `UIComponent` renders as: `null` when it belongs to no group
 * (rendered elsewhere, e.g. the chat input), `"unimplemented"` when the widget
 * has no field yet.
 *
 * Shared by the renderer and the validator so both read a component the same way.
 */
export function uiComponentToFieldConfig(
  component: UIComponent
): FieldConfig | "unimplemented" | null {
  if (!component.group) {
    return null;
  }

  const props = component.props as ComponentProps;
  const label = props?.label ?? "";
  const placeholder = props?.placeholder ?? "";

  const baseConfig = {
    key: component.id,
    group: component.group,
    label,
    placeholder,
    required: component.flag_config?.required || false,
  };

  switch (component.widget) {
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
      };

    case "SelectField":
      return {
        ...baseConfig,
        type: "select" as const,
        widget: component.widget,
        options: mapOptions(props?.options),
      };

    case "CheckboxGroupField":
      return {
        ...baseConfig,
        type: "multiselect" as const,
        widget: component.widget,
        options: mapOptions(props?.options),
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
