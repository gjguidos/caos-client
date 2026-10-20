import type {
  FieldRendererProps,
  FormValue,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { ActionButtonField } from "./components/fields/ActionButtonField";
import { CheckboxGroupField } from "./components/fields/CheckboxGroupField";
import { FileField } from "./components/fields/FileField";
import { JsonField } from "./components/fields/JsonField";
import { NumberField } from "./components/fields/NumberField";
import { SelectField } from "./components/fields/SelectField";
import { SwitchField } from "./components/fields/SwitchField";
import { TextField } from "./components/fields/TextField";
import { TextareaField } from "./components/fields/TextareaField";
import { fieldError } from "./validateField";

export function FieldRenderer({
  config,
  value,
  onChange,
  onAction,
}: FieldRendererProps) {
  const error = fieldError(config, value);
  const handleChange = (newValue: FormValue) => {
    onChange(config.key, newValue);
  };

  const baseProps = {
    id: `tool-form-${config.key}`,
    label: config.label,
    placeholder: config.placeholder,
    required: config.required,
    disabled: config.disabled,
  };

  switch (config.widget) {
    case "TextField":
      return (
        <TextField
          {...baseProps}
          value={value as string | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
        />
      );

    case "TextArea":
      return (
        <TextareaField
          {...baseProps}
          value={value as string | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
          fileUpload={config.type === "text" ? config.file_upload : undefined}
        />
      );

    case "NumberField":
      return (
        <NumberField
          {...baseProps}
          value={value as number | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
          min={config.type === "number" ? config.min : undefined}
          max={config.type === "number" ? config.max : undefined}
          step={config.type === "number" ? config.step : undefined}
          error={error}
        />
      );

    case "SelectField":
      return (
        <SelectField
          {...baseProps}
          value={value as string | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
          options={config.type === "select" ? config.options : []}
        />
      );

    case "CheckboxGroupField":
      return (
        <CheckboxGroupField
          {...baseProps}
          value={value as string[] | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
          options={config.type === "multiselect" ? config.options : []}
        />
      );

    case "SwitchField":
      return (
        <SwitchField
          {...baseProps}
          checked={Boolean(value)}
          onChange={(nextValue) => handleChange(nextValue)}
        />
      );

    case "JsonField":
      return (
        <JsonField
          {...baseProps}
          value={value as string | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
        />
      );

    case "FileField":
      return (
        <FileField
          {...baseProps}
          value={value as string | undefined}
          onChange={(nextValue) => handleChange(nextValue)}
          acceptedMimes={
            config.type === "file" ? config.acceptedMimes : undefined
          }
          uploadTarget={
            config.type === "file" ? config.uploadTarget : undefined
          }
        />
      );

    case "ActionButton":
      return (
        <ActionButtonField
          id={config.key}
          label={config.label}
          description={config.description}
          helperText={config.helperText}
          disabled={config.disabled}
          status={config.status ?? "idle"}
          statusMessage={config.statusMessage}
          labels={config.labels}
          variant={config.variant}
          onClick={() => {
            void onAction?.();
          }}
        />
      );

    // Widgets with no renderer surface as a visible placeholder rather than
    // vanishing: a field the backend declared but the client drops silently is
    // far harder to notice than one that says so.
    default:
      return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-text-1">
            {config.label || config.key}
          </p>

          <p className="text-xs text-text-2">
            Widget <strong>{config.widget}</strong> not implemented yet
          </p>
        </div>
      );
  }
}
