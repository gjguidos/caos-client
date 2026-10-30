import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import type {
  FormValue,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import type { ActionButtonStatus } from "@/app/(workspace)/_tool-form/components/fields/ActionButtonField";
import { useRenderPath } from "@/app/(workspace)/_hooks/useRenderPath";
import { useCallback } from "react";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import { FieldRenderer } from "./FieldRenderer";
import { uiComponentToFieldConfig } from "./lib/uiComponentToFieldConfig";

interface ToolPropertiesFormProps {
  emptyMessage?: string;
  missingPathMessage?: string;
  onAction?: (component: UIComponent) => void | Promise<void>;
  actionStatuses?: Record<string, ActionButtonStatus>;
  actionMessages?: Record<string, string | undefined>;
}

export function ToolPropertiesForm({
  emptyMessage = "Select a tool with configurable parameters to see options here.",
  missingPathMessage = "The selected tool has UI metadata, but no properties panel components.",
  onAction,
  actionStatuses,
  actionMessages,
}: ToolPropertiesFormProps) {
  const { values, setValue, uiComponents, groupLabelMap } = useToolForm();

  return (
    <ControlledToolPropertiesForm
      values={values}
      onChange={setValue}
      uiComponents={uiComponents ?? []}
      groupLabelMap={groupLabelMap}
      emptyMessage={emptyMessage}
      missingPathMessage={missingPathMessage}
      onAction={onAction}
      actionStatuses={actionStatuses}
      actionMessages={actionMessages}
    />
  );
}

/** Draft-owned values: no Redux tool selection, invocation, upload or action transport. */
export function ControlledToolPropertiesForm({
  idPrefix,
  values,
  onChange,
  uiComponents,
  groupLabelMap = {},
  emptyMessage = "This Tool declares no editable Agent configuration fields.",
  missingPathMessage = "No configuration fields are available.",
  onAction,
  actionStatuses,
  actionMessages,
}: ToolPropertiesFormProps & {
  values: FormValues;
  onChange: (key: string, value: FormValue) => void;
  uiComponents: UIComponent[];
  idPrefix?: string;
  groupLabelMap?: Record<string, string>;
}) {
  const propertiesPanel = useRenderPath("propertiesPanel", uiComponents);

  const handleChange = useCallback(
    (key: string, value: FormValue) => {
      onChange(key, value);
    },
    [onChange]
  );

  if (!uiComponents || uiComponents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-text-2 text-center text-sm">{emptyMessage}</p>
      </div>
    );
  }

  if (propertiesPanel.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        {missingPathMessage}
      </div>
    );
  }

  return (
    <DynamicFormRenderer
      uiComponents={propertiesPanel}
      groupLabelMap={groupLabelMap}
      values={values}
      onChange={handleChange}
      renderField={({ component, value, defaultField }) => {
        if (!idPrefix) return defaultField;
        const config = uiComponentToFieldConfig(component);
        if (!config || config === "unimplemented") return defaultField;
        return (
          <FieldRenderer
            config={{ ...config, key: `${idPrefix}-${config.key}` }}
            value={value}
            onChange={(_, next) => handleChange(component.id, next)}
          />
        );
      }}
      onAction={(component) => {
        void onAction?.(component);
      }}
      actionStatuses={actionStatuses}
      actionMessages={actionMessages}
    />
  );
}
