import { serializeUIComponents } from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import type { FormRoleAdapter } from "@/app/(workspace)/_agent-runtime/lib/formRoleResolver";

export const genericFormRoleAdapter: FormRoleAdapter = {
  key: "generic",

  resolveFormTool({ config, tools }) {
    const sourceKey = config.form_source?.key;

    if (sourceKey) {
      return findToolByKey(tools, sourceKey);
    }

    return tools.find(toolSupportsFormUi) ?? tools[0] ?? null;
  },

  buildSubmitMessage({ values, tool, config }) {
    if (config.submit_target?.type === "workflow") {
      return buildWorkflowSubmitMessage({
        workflowKey: config.submit_target.key,
        values,
      });
    }

    return serializeUIComponents(
      values,
      tool.ui ?? [],
      tool.uiChatInput ?? null,
      tool.key ?? "tool"
    );
  },
};

function findToolByKey(
  tools: EnrichedTool[],
  key: string
): EnrichedTool | null {
  const normalized = normalizeKey(key);

  return (
    tools.find((tool) => normalizeKey(tool.key) === normalized) ??
    tools.find((tool) => normalizeKey(tool.provider_key) === normalized) ??
    null
  );
}

function toolSupportsFormUi(tool: EnrichedTool): boolean {
  return Boolean(
    Array.isArray(tool.ui) || tool.uiChatInput || tool.uiOutputProfiles
  );
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^tools:/, "")
    .replace(/^workflows:/, "")
    .replace(/\s+/g, "_");
}

function buildWorkflowSubmitMessage({
  workflowKey,
  values,
}: {
  workflowKey: string;
  values: Record<string, unknown>;
}) {
  return `@workflow --key=${workflowKey} --inputs=${JSON.stringify(values)}`;
}
