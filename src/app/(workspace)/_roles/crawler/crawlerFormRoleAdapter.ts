import { CrawlerConfigurationAdapter } from "@/app/(workspace)/_roles/crawler/_components/CrawlerConfigurationAdapter";
import type { FormRoleAdapter } from "@/app/(workspace)/_agent-runtime/lib/formRoleResolver";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import type {
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

export const crawlerFormRoleAdapter: FormRoleAdapter = {
  key: "crawler",
  resultRenderer: "crawler",
  ConfigurationComponent: CrawlerConfigurationAdapter,

  resolveFormTool({ config, tools }) {
    const sourceKey =
      config.form_source?.key ?? "web_crawler";

    return findToolByKey(
      tools,
      sourceKey
    );
  },

  buildSubmitMessage({
    values,
    tool,
    config,
  }) {
    const submitTarget =
      config.submit_target;

    if (
      submitTarget?.type === "workflow" &&
      submitTarget.key !== "crawl_operation_v1"
    ) {
      return (
        `@workflow ` +
        `--key=${submitTarget.key} ` +
        `--inputs=${JSON.stringify(values)}`
      );
    }

    return buildToolCommand({
      toolKey: tool.key ?? "web_crawler",
      values,
      components: tool.ui ?? [],
    });
  },

  supportsBrowserSession({
    config,
    tools,
  }) {
    if (
      config.browser_session === "enabled"
    ) {
      return true;
    }

    if (
      config.browser_session === "disabled"
    ) {
      return false;
    }

    const tool = findToolByKey(
      tools,
      config.form_source?.key ??
        "web_crawler"
    );

    return Boolean(
      tool?.ui?.some((component) =>
        [
          "auth_mode",
          "browser_session_id",
          "start_browser_session",
        ].includes(component.id)
      )
    );
  },
};

function buildToolCommand({
  toolKey,
  values,
  components,
}: {
  toolKey: string;
  values: FormValues;
  components: UIComponent[];
}): string {
  const args = components
    .filter(
      (component) =>
        component.type !== "action"
    )
    .filter((component) =>
      Boolean(
        component.flag_config?.flag
      )
    )
    .flatMap((component) => {
      const value =
        values[component.id];

      if (!hasMeaningfulValue(value)) {
        return [];
      }

      const flag =
        component.flag_config?.flag;

      if (!flag) {
        return [];
      }

      return [
        `${flag}=${serializeCommandValue(
          value
        )}`,
      ];
    });

  return [
    `@${toolKey}`,
    ...args,
  ].join(" ");
}

function hasMeaningfulValue(
  value: unknown
): boolean {
  if (
    value === undefined ||
    value === null
  ) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function serializeCommandValue(
  value: unknown
): string {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",");
  }

  if (typeof value === "boolean") {
    return value
      ? "true"
      : "false";
  }

  return String(value);
}

function findToolByKey(
  tools: EnrichedTool[],
  key: string
): EnrichedTool | null {
  const normalized =
    normalizeKey(key);

  return (
    tools.find(
      (tool) =>
        normalizeKey(tool.key) ===
        normalized
    ) ??
    tools.find(
      (tool) =>
        normalizeKey(
          tool.provider_key
        ) === normalized
    ) ??
    null
  );
}

function normalizeKey(
  value: unknown
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^tools\:/, "")
    .replace(/^workflows\:/, "")
    .replace(/\s+/g, "_");
}