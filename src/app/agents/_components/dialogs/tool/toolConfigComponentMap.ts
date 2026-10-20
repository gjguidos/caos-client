import { DrawToolConfig } from "./DrawToolConfig";
import { WorkflowToolConfig } from "./WorkflowToolConfig";

export const TOOL_CONFIG_COMPONENTS: Record<
  string,
  React.ComponentType<any>
> = {
  draw: DrawToolConfig,
  workflow: WorkflowToolConfig,
};
