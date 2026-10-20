import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import type {
  FormValue,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import type { ActionButtonStatus } from "@/app/(workspace)/_tool-form/components/fields/ActionButtonField";
import { useRenderPath } from "@/app/(workspace)/_hooks/useRenderPath";
import { useCallback } from "react";
import { DynamicFormRenderer } from "./DynamicFormRenderer";

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

  const propertiesPanel = useRenderPath("propertiesPanel", uiComponents);

  const handleChange = useCallback(
    (key: string, value: FormValue) => {
      setValue(key, value);
    },
    [setValue]
  );

  if (!uiComponents || uiComponents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-sm text-text-2">{emptyMessage}</p>
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
      onAction={(component) => {
        void onAction?.(component);
      }}
      actionStatuses={actionStatuses}
      actionMessages={actionMessages}
    />
  );
}
