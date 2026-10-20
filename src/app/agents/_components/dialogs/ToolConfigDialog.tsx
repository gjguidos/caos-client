import { TOOL_CONFIG_COMPONENTS } from "./tool/toolConfigComponentMap";

interface ToolConfigDialogProps {
  /** Registry key of the tool being configured. */
  toolKey: string;
  config: any;
  onChange: (updatedConfig: any) => void;
  lockedFields?: Record<string, boolean>;
}

export const ToolConfigDialog = ({
  toolKey,
  config,
  onChange,
  lockedFields,
}: ToolConfigDialogProps) => {
  const ToolComponent = TOOL_CONFIG_COMPONENTS[toolKey];

  if (!ToolComponent) {
    return (
      <div className="p-4 text-sm text-gray-500">
        ⚠️ No config UI registered for tool: <strong>{toolKey}</strong>
      </div>
    );
  }

  return (
    <ToolComponent
      config={config}
      onConfigChange={onChange}
      lockedFields={lockedFields}
    />
  );
};
