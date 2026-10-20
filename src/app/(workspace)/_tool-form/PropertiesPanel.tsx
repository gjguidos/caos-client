import { Eyebrow } from "@/shared/components/Eyebrow/Eyebrow";
import { ToolPropertiesForm } from "./ToolPropertiesForm";

export function PropertiesPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-75 xl:pr-100">
          <Eyebrow tagName="h2" className="mb-75">
            Tool Configuration
          </Eyebrow>

          <ToolPropertiesForm />
        </div>
      </div>
    </div>
  );
}
