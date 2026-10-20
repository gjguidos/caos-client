import type { ComponentType, SyntheticEvent } from "react";

import type { UseBrowserSessionReturn } from "@/app/(workspace)/_capabilities/browser-session/useBrowserSession";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import type {
  FormValues,
  FormValue,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { genericFormRoleAdapter } from "@/app/(workspace)/_roles/generic/genericFormRoleAdapter";
import { crawlerFormRoleAdapter } from "@/app/(workspace)/_roles/crawler/crawlerFormRoleAdapter";
import type {
  ExecuteOperationCancellation,
} from "@/app/(workspace)/form/_hooks/useFormAgent";

import type {
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

export type FormAgentConfig = {
  layout?: string;
  role_adapter?: string;
  default_operation?: string;
  form_source?: {
    type: "tool" | "workflow";
    key: string;
  };
  submit_target?: {
    type: "tool" | "workflow";
    key: string;
  };
  submit_mode?: "execute_tool" | "execute_workflow" | "chat_then_execute";
  result_renderer?: string;
  browser_session?: "enabled" | "disabled" | "auto";
  output_profiles?: "enabled" | "disabled" | "auto";
  sections?: Record<string, boolean>;
};

export type FormRoleAdapterContext = {
  agentData: unknown;
  config: FormAgentConfig;
  tools: EnrichedTool[];
};

export type BuildSubmitMessageArgs = {
  values: FormValues;
  tool: EnrichedTool;
  config: FormAgentConfig;
};

export type FormRoleConfigurationProps = {
  tool: EnrichedTool | null;
  values: FormValues;
  setValue: (key: string, value: FormValue) => void;

  formError: string | null;
  executionError: string | null;

  isRunning: boolean;
  cancelOperation: ExecuteOperationCancellation;
  canExecute: boolean;
  hasResultOrLogs: boolean;

  operationStatus: string | null;

  onExecuteUiAction?: (
    component: UIComponent
  ) => void | Promise<void>;

  supportsBrowserSession: boolean;

  /*
   * Browser-session props travel together and are all required whenever
   * `supportsBrowserSession` is true. They were optional once, and the page
   * simply never passed the two handlers - optional chaining swallowed it and
   * the Sign in button silently did nothing. Keeping them required means a
   * missing wire is a type error rather than a dead button.
   */
  browserSession: UseBrowserSessionReturn | null;
  onStartBrowserSession: () => void;
  onCaptureBrowserSession: () => void;

  onSubmit: (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => void;
  onReset: () => void;
};

export type FormRoleAdapter = {
  key: string;

  ConfigurationComponent?: ComponentType<FormRoleConfigurationProps>;

  resolveFormTool: (context: FormRoleAdapterContext) => EnrichedTool | null;
  buildSubmitMessage: (args: BuildSubmitMessageArgs) => string;

  supportsBrowserSession?: (context: FormRoleAdapterContext) => boolean;

  extractResult?: (raw: unknown) => unknown | null;
  extractError?: (result: unknown) => string;
  resultRenderer?: string;
};

const ROLE_ADAPTERS: Record<string, FormRoleAdapter> = {
  generic: genericFormRoleAdapter,
  crawler: crawlerFormRoleAdapter,
};

export function resolveFormRoleAdapter(
  config: FormAgentConfig
): FormRoleAdapter {
  const key = config.role_adapter ?? "generic";
  return ROLE_ADAPTERS[key] ?? genericFormRoleAdapter;
}

export function getFormAgentConfig(agentData: unknown): FormAgentConfig {
  const record = getRecord(agentData);

  if (!record) {
    return {};
  }

  const metadata = getRecord(record.metadata);
  const role = getRecord(record.role);
  const roleSpec = getRecord(record.role_spec);
  const roleMetadata = getRecord(role?.metadata);
  const roleSpecMetadata = getRecord(roleSpec?.metadata);

  const configs = [
    getRecord(roleSpecMetadata?.default_config),
    getRecord(roleMetadata?.default_config),
    getRecord(roleSpec?.default_config),
    getRecord(role?.default_config),
    getRecord(metadata?.default_config),
    getRecord(record.default_config),
    getRecord(record.config),
    getRecord(metadata?.config),
  ];

  const merged = Object.assign(
    {},
    ...configs.filter(Boolean)
  ) as FormAgentConfig;

  if (!merged.role_adapter) {
    const inferredRoleAdapter = inferRoleAdapterFromAgentData(record);

    if (inferredRoleAdapter) {
      merged.role_adapter = inferredRoleAdapter;
    }
  }

  if (!merged.layout && normalizeValue(record.type) === "form") {
    merged.layout = "tool_form";
  }

  if (!merged.form_source && merged.role_adapter === "crawler") {
    merged.form_source = {
      type: "tool",
      key: "web_crawler",
    };
  }

  if (!merged.submit_mode && merged.role_adapter === "crawler") {
    merged.submit_mode = "execute_workflow";
  }

  if (!merged.submit_target && merged.role_adapter === "crawler") {
    merged.submit_target = resolveWorkflowSubmitTarget(record);
  }

  if (!merged.browser_session && merged.role_adapter === "crawler") {
    merged.browser_session = "enabled";
  }

  if (!merged.output_profiles && merged.role_adapter === "crawler") {
    merged.output_profiles = "enabled";
  }

  return merged;
}

function inferRoleAdapterFromAgentData(
  record: Record<string, unknown>
): string | null {
  const explicit =
    stringOrNull(record.role_adapter) ?? stringOrNull(record.roleAdapter);

  if (explicit) {
    return normalizeValue(explicit);
  }

  const roleName = normalizeValue(record.role_name);

  if (roleName === "crawler") {
    return "crawler";
  }

  const type = normalizeValue(record.type);

  if (type === "form") {
    return "generic";
  }

  return null;
}

function resolveWorkflowSubmitTarget(
  record: Record<string, unknown>
): FormAgentConfig["submit_target"] {
  const tools = Array.isArray(record.tools) ? record.tools : [];

  const workflowTool = tools.find((tool) => {
    const item = getRecord(tool);
    return normalizeValue(item?.key) === "workflow";
  });

  const workflowConfig = getRecord(getRecord(workflowTool)?.config);

  const workflowKey =
    stringOrNull(workflowConfig?.workflow_key) ?? "crawl_operation_v1";

  return {
    type: "workflow",
    key: workflowKey,
  };
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}
