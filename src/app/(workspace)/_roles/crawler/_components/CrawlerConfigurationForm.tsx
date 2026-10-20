"use client";

import { useMemo, useRef, useState, type SyntheticEvent } from "react";

import { getProfileDefaults } from "@/app/(workspace)/_tool-form/lib/profileValues";

import { Alert, AlertDescription } from "@/shared/components/Alert/Alert";
import { CrawlerOutputProfileSection } from "@/app/(workspace)/_roles/crawler/_components/CrawlerOutputProfileSection";
import type { ActionButtonStatus } from "@/app/(workspace)/_tool-form/components/fields/ActionButtonField";
import { ToolSidePanel } from "@/app/(workspace)/_tool-form/components/ToolSidePanel";
import { ToolProfileConfiguration } from "@/app/(workspace)/_tool-form/components/ToolProfileConfiguration";
import type {
  FormScalarValue,
  FormValue,
  FormValues,
  UIComponent,
  UICondition,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { FieldRenderer } from "@/app/(workspace)/_tool-form/FieldRenderer";
import { uiComponentToFieldConfig } from "@/app/(workspace)/_tool-form/lib/uiComponentToFieldConfig";
import { mergeReportValues } from "@/app/(workspace)/_roles/crawler/helpers/reportValues";
import { resolveSearchInference } from "@/app/(workspace)/_roles/crawler/helpers/searchInferenceResolver";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import type { UseBrowserSessionReturn } from "@/app/(workspace)/_capabilities/browser-session/useBrowserSession";
import { CrawlTargetInput } from "@/app/(workspace)/_roles/crawler/_components/CrawlerTargetInput";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

import { executeUiAction } from "@/app/(workspace)/_tool-form/actions/executeUIAction";

type BrowserSessionState = UseBrowserSessionReturn | null;

type FeaturePanelGroup = {
  id: string;
  label?: string;
  fields: string[];
};

type FeaturePanelConfig = {
  id: string;
  label: string;
  description?: string;
  produces_report?: string;
  fields?: string[];
  groups?: FeaturePanelGroup[];
};

type ExecuteOperationCancellation = (
  executeCancel: (runId: string) => Promise<void>
) => Promise<void>;

type CrawlerConfigurationFormProps = {
  crawlerToolDef: EnrichedTool | null;

  formError: string | null;
  crawlerError: string | null;

  values: FormValues;
  setValue: (key: string, value: FormValue) => void;

  isRunning: boolean;
  operationStatus?: string | null;

  canExecute: boolean;
  hasResultOrLogs: boolean;

  requiresBrowserSession: boolean;
  browserSession: BrowserSessionState;

  browserActionStatus: ActionButtonStatus;
  browserActionMessage?: string;

  onSubmit: (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => void;

  cancelOperation: ExecuteOperationCancellation;

  onStartBrowserSession: () => void;
  onCaptureBrowserSession: () => void;
  onReset: () => void;
};

export function CrawlerConfigurationForm({
  crawlerToolDef,
  values,
  setValue,
  formError,
  crawlerError,
  isRunning,
  operationStatus,
  browserSession,
  onSubmit,
  cancelOperation,
  onStartBrowserSession,
  onCaptureBrowserSession,
}: CrawlerConfigurationFormProps) {
  const [sidePanel, setSidePanel] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const crawlerUiComponents = useMemo(
    () => crawlerToolDef?.ui ?? [],
    [crawlerToolDef]
  );

  const profileConfig = useMemo(
    () => crawlerToolDef?.uiOutputProfiles ?? null,
    [crawlerToolDef]
  );

  const featurePanels = useMemo(
    () => crawlerToolDef?.uiFeaturePanels ?? [],
    [crawlerToolDef]
  );

  const searchBehavior = crawlerToolDef?.uiSearchBehavior ?? null;

  const searchInference = useMemo(
    () =>
      resolveSearchInference({
        value: values.find,
        searchBehavior,
        components: crawlerUiComponents,
      }),
    [values.find, searchBehavior, crawlerUiComponents]
  );

  const selectedProfile = String(
    values.output_profile ?? profileConfig?.default ?? "general"
  );

  const profileDefaults = getProfileDefaults(profileConfig, selectedProfile);

  const uiState = useMemo<ToolUiState>(
    () => ({
      operation: {
        status: operationStatus ?? (isRunning ? "running" : null),
      },

      browser_session: {
        has_session: Boolean(browserSession?.hasSession),

        ready: Boolean(browserSession?.ready),

        is_closing: Boolean(browserSession?.isClosing),
      },
    }),
    [
      operationStatus,
      isRunning,
      browserSession?.hasSession,
      browserSession?.ready,
      browserSession?.isClosing,
    ]
  );

  const handleUiAction = (component: UIComponent) =>
    executeUiAction(component, {
      values,
      state: uiState,

      operationBinding: crawlerToolDef?.uiOperationBinding ?? null,

      submitTool: () => {
        formRef.current?.requestSubmit();
      },

      cancelOperation,
    });

  const crawlerActionComponents = useMemo(
    () =>
      crawlerUiComponents
        .filter(
          (component) =>
            component.type === "action" &&
            component.render_paths?.includes(
              "workspace.conversationArea.inputSection.actions"
            )
        )
        .sort(
          (left, right) => (left.slot_order ?? 0) - (right.slot_order ?? 0)
        ),
    [crawlerUiComponents]
  );

  const behaviorReports = useMemo(() => {
    const reports = new Set(searchInference.inferredReports);

    for (const panel of featurePanels) {
      if (
        panel.produces_report &&
        panelHasMeaningfulValues({
          panel,
          values,
          inferredValues: searchInference.inferredValues,
        })
      ) {
        reports.add(panel.produces_report);
      }
    }

    return [...reports];
  }, [
    featurePanels,
    values,
    searchInference.inferredReports,
    searchInference.inferredValues,
  ]);

  const effectiveReports = useMemo(
    () =>
      mergeReportValues(
        values.report ?? profileDefaults?.report,
        behaviorReports
      ),
    [values.report, profileDefaults?.report, behaviorReports]
  );

  const activeFeaturePanel =
    featurePanels.find((panel) => panel.id === sidePanel) ?? null;

  return (
    <>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 pb-4">
            <div className="agent-wizard-card space-y-6">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Crawl configuration
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choose a target and a crawl preset. Fine-tune only when
                  needed.
                </p>
              </header>

              <CrawlerTargetSection
                url={String(values.url ?? "")}
                onUrlChange={(value) => setValue("url", value)}
                browserSession={browserSession}
                onStartBrowserSession={onStartBrowserSession}
                onCaptureBrowserSession={onCaptureBrowserSession}
                isRunning={isRunning}
                state={uiState}
                actions={crawlerActionComponents}
                values={values}
                onExecuteUiAction={handleUiAction}
              />

              <CrawlerScopeSection
                components={crawlerUiComponents}
                value={values.crawl_scope}
                onChange={(value) => setValue("crawl_scope", value)}
              />

              <CrawlerSitemapDiscoverySection
                components={crawlerUiComponents}
                values={values}
                value={values.sitemap_discovery_mode}
                onChange={(value) => setValue("sitemap_discovery_mode", value)}
              />

              <CrawlerSitemapLimitsSection
                components={crawlerUiComponents}
                values={values}
                onValueChange={setValue}
              />

              <CrawlerOutputProfileSection
                crawlerToolDef={crawlerToolDef}
                values={values}
                outputProfile={selectedProfile}
                effectiveReports={effectiveReports}
                onValueChange={setValue}
                onOpenConfiguration={() => setSidePanel("preset")}
              />

              {featurePanels.map((panel) => (
                <FeaturePanelRow
                  key={panel.id}
                  panel={panel}
                  values={values}
                  inferredValues={searchInference.inferredValues}
                  reports={behaviorReports}
                  onOpen={() => setSidePanel(panel.id)}
                />
              ))}
            </div>

            {!crawlerToolDef && (
              <Alert>
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />

                <AlertDescription>
                  The agent does not expose an enriched Web Crawler Tool. This
                  page reuses the same source as chat:{" "}
                  <code>agent.enrichedTools</code>.
                </AlertDescription>
              </Alert>
            )}

            {(formError || crawlerError) && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />

                <AlertDescription>{formError || crawlerError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </form>

      <ToolSidePanel
        open={sidePanel === "preset"}
        onOpenChange={(open) => {
          if (!open) {
            setSidePanel(null);
          }
        }}
        title="Preset configuration"
        description="Review the settings included in the selected crawl preset."
      >
        <ToolProfileConfiguration
          profileConfig={profileConfig}
          selectedProfile={selectedProfile}
        />
      </ToolSidePanel>

      {activeFeaturePanel && (
        <ToolSidePanel
          open
          onOpenChange={(open) => {
            if (!open) {
              setSidePanel(null);
            }
          }}
          title={activeFeaturePanel.label}
          description={activeFeaturePanel.description}
        >
          <FeaturePanelConfiguration
            panel={activeFeaturePanel}
            components={crawlerUiComponents}
            values={values}
            inferredValues={searchInference.inferredValues}
            inferredReports={behaviorReports}
            profileDefaults={profileDefaults ?? {}}
            onValueChange={setValue}
          />
        </ToolSidePanel>
      )}
    </>
  );
}

function CrawlerScopeSection({
  components,
  value,
  onChange,
}: {
  components: UIComponent[];
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const component = components.find(
    (candidate) => candidate.id === "crawl_scope"
  );

  if (!component) {
    return null;
  }

  const config = uiComponentToFieldConfig(component);

  if (!config || config === "unimplemented") {
    return null;
  }

  const defaultValue = component.props?.defaultValue as FormValue | undefined;

  const effectiveValue: FormValue = hasMeaningfulValue(value)
    ? value
    : (defaultValue ?? "site");

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Crawl scope"
        description="Choose what the crawler should cover."
      />

      <FieldRenderer
        config={config}
        value={effectiveValue}
        onChange={(_key, nextValue) => onChange(nextValue)}
      />
    </section>
  );
}

type ToolUiState = {
  operation: {
    status: string | null;
  };
  browser_session: {
    has_session: boolean;
    ready: boolean;
    is_closing: boolean;
  };
};

function CrawlerSitemapDiscoverySection({
  components,
  values,
  value,
  onChange,
}: {
  components: UIComponent[];
  values: FormValues;
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const component = components.find(
    (candidate) => candidate.id === "sitemap_discovery_mode"
  );

  if (!component) {
    return null;
  }

  if (
    !resolveUiVisibility({
      condition: component.visible_when,
      values,
      state: null,
    })
  ) {
    return null;
  }

  const config = uiComponentToFieldConfig(component);

  if (!config || config === "unimplemented") {
    return null;
  }

  const defaultValue = component.props?.defaultValue as FormValue | undefined;

  const effectiveValue = hasMeaningfulValue(value)
    ? value
    : (defaultValue ?? "planned");

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Sitemap discovery"
        description={String(
          component.props?.helperText ??
            "Choose how sitemap targets should be discovered."
        )}
      />

      <FieldRenderer
        config={config}
        value={effectiveValue}
        onChange={(_key, nextValue) => onChange(nextValue)}
      />
    </section>
  );
}

function CrawlerSitemapLimitsSection({
  components,
  values,
  onValueChange,
}: {
  components: UIComponent[];
  values: FormValues;
  onValueChange: (key: string, value: FormValue) => void;
}) {
  const sitemapComponents = [
    "sitemap_traversal_policy",
    "max_sitemaps",
    "page_acquisition_limit",
  ]
    .map((id) => components.find((component) => component.id === id))
    .filter((component): component is UIComponent => component !== undefined)
    .filter((component) =>
      resolveUiVisibility({
        condition: component.visible_when,
        values,
        state: null,
      })
    );

  if (sitemapComponents.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Sitemap limits"
        description="Control sitemap discovery breadth and page acquisition."
      />

      <div className="space-y-4">
        {sitemapComponents.map((component) => {
          const config = uiComponentToFieldConfig(component);

          if (!config || config === "unimplemented") {
            return null;
          }

          const defaultValue = component.props?.defaultValue as
            | FormValue
            | undefined;

          const effectiveValue = hasMeaningfulValue(values[component.id])
            ? values[component.id]
            : defaultValue;

          return (
            <FieldRenderer
              key={component.id}
              config={config}
              value={effectiveValue}
              onChange={(key, nextValue) => onValueChange(key, nextValue)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ToolActionBar({
  components,
  values,
  state,
  onExecute,
}: {
  components: UIComponent[];
  values: FormValues;
  state: ToolUiState;
  onExecute: (component: UIComponent) => void | Promise<void>;
}) {
  const visibleComponents = components.filter((component) =>
    resolveUiVisibility({
      condition: component.visible_when,
      values,
      state,
    })
  );

  if (visibleComponents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {visibleComponents.map((component) => {
        const disabled = resolveUiDisabled({
          conditions: component.disabled_when,
          values,
          state,
        });

        return (
          <Button
            key={component.id}
            type="button"
            variant={resolveButtonVariant(component.props?.variant)}
            size="sm"
            disabled={disabled}
            onClick={() => {
              void onExecute(component);
            }}
          >
            {resolveActionLabel(component, state)}
          </Button>
        );
      })}
    </div>
  );
}

function resolveActionLabel(
  component: UIComponent,
  state: ToolUiState
): string {
  const action = component.props?.action as
    | {
        labels?: Record<string, string>;
      }
    | undefined;

  if (state.operation.status === "cancelling" && action?.labels?.loading) {
    return action.labels.loading;
  }

  return String(component.props?.label ?? action?.labels?.idle ?? component.id);
}

function resolveButtonVariant(
  value: unknown
): "default" | "outline" | "ghost" {
  switch (value) {
    case "primary":
      return "default";
    case "tertiary":
      return "ghost";
    default:
      return "outline";
  }
}

function resolveUiVisibility({
  condition,
  values,
  state,
}: {
  condition?: UICondition;
  values: FormValues;
  state: ToolUiState | null;
}): boolean {
  if (!condition) {
    return true;
  }

  return evaluateUiCondition(
    resolveConditionValue({
      condition,
      values,
      state,
    }),
    condition
  );
}

function resolveUiDisabled({
  conditions,
  values,
  state,
}: {
  conditions?: UICondition[];
  values: FormValues;
  state: ToolUiState;
}): boolean {
  if (!conditions?.length) {
    return false;
  }

  return conditions.some((condition) =>
    evaluateUiCondition(
      resolveConditionValue({
        condition,
        values,
        state,
      }),
      condition
    )
  );
}

function resolveConditionValue({
  condition,
  values,
  state,
}: {
  condition: UICondition;
  values: FormValues;
  state: ToolUiState | null;
}): unknown {
  if (typeof condition.field === "string") {
    return values[condition.field];
  }

  if (typeof condition.state === "string" && state) {
    return getNestedValue(state, condition.state);
  }

  return undefined;
}

function evaluateUiCondition(
  actualValue: unknown,
  condition: UICondition
): boolean {
  switch (condition.operator) {
    case "in":
      return Array.isArray(condition.value)
        ? condition.value.includes(actualValue as FormScalarValue)
        : false;

    case "not_in":
      return Array.isArray(condition.value)
        ? !condition.value.includes(actualValue as FormScalarValue)
        : true;

    case "empty":
      return !hasMeaningfulValue(actualValue);

    case "not_empty":
      return hasMeaningfulValue(actualValue);

    case "equals":
      return actualValue === condition.value;

    case "not_equals":
      return actualValue !== condition.value;
  }
}

function getNestedValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function FeaturePanelRow({
  panel,
  values,
  inferredValues,
  reports,
  onOpen,
}: {
  panel: FeaturePanelConfig;
  values: FormValues;
  inferredValues: Record<string, FormValue>;
  reports: string[];
  onOpen: () => void;
}) {
  const activeFields = getActivePanelFields({
    panel,
    values,
    inferredValues,
  });

  const hasValues = activeFields.length > 0;

  const panelReports =
    panel.id === "search"
      ? reports
      : panel.produces_report && reports.includes(panel.produces_report)
        ? [panel.produces_report]
        : [];

  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold text-foreground">
            {panel.label}
          </h3>

          {hasValues ? (
            <>
              <p className="text-xs text-muted-foreground">
                {activeFields
                  .map((field) =>
                    formatFieldSummary(
                      field,
                      hasMeaningfulValue(values[field])
                        ? values[field]
                        : inferredValues[field]
                    )
                  )
                  .join(" · ")}
              </p>

              {panelReports.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Added {panelReports.length === 1 ? "report" : "reports"}:{" "}
                  {panelReports.join(", ")}
                </p>
              )}
            </>
          ) : (
            panel.description && (
              <p className="text-xs text-muted-foreground">
                {panel.description}
              </p>
            )
          )}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onOpen}>
          {hasValues ? "Edit" : "Configure"}
        </Button>
      </div>
    </section>
  );
}

function FeaturePanelConfiguration({
  panel,
  components,
  values,
  inferredValues,
  inferredReports,
  profileDefaults,
  onValueChange,
}: {
  panel: FeaturePanelConfig;
  components: UIComponent[];
  values: FormValues;
  inferredValues: Record<string, FormValue>;
  inferredReports: string[];
  profileDefaults: Record<string, FormValue>;
  onValueChange: (key: string, value: FormValue) => void;
}) {
  const groups = panel.groups?.length
    ? panel.groups
    : [
        {
          id: panel.id,
          fields: panel.fields ?? [],
        },
      ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="space-y-4">
          {group.label && (
            <h3 className="font-semibold text-foreground">
              {group.label}
            </h3>
          )}

          {group.fields.map((fieldId) => {
            const component = components.find(
              (candidate) => candidate.id === fieldId
            );

            if (!component) {
              return null;
            }

            return (
              <FeatureField
                key={fieldId}
                component={component}
                value={values[fieldId]}
                inferredValue={inferredValues[fieldId]}
                inferredReports={inferredReports}
                defaultValue={
                  profileDefaults[fieldId] ??
                  (component.props?.defaultValue as FormValue | undefined)
                }
                onChange={(value) => onValueChange(fieldId, value)}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}

function FeatureField({
  component,
  value,
  inferredValue,
  inferredReports,
  defaultValue,
  onChange,
}: {
  component: UIComponent;
  value: FormValue;
  inferredValue?: FormValue;
  inferredReports: string[];
  defaultValue?: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const config = uiComponentToFieldConfig(component);

  if (!config || config === "unimplemented") {
    return null;
  }

  let effectiveValue: FormValue;

  if (component.id === "report") {
    effectiveValue = mergeReportValues(
      hasMeaningfulValue(value) ? value : defaultValue,
      inferredReports
    );
  } else if (
    component.type === "multiselect" &&
    hasMeaningfulValue(inferredValue)
  ) {
    effectiveValue = mergeMultiSelectValues(value, inferredValue);
  } else {
    effectiveValue = hasMeaningfulValue(value)
      ? value
      : hasMeaningfulValue(inferredValue)
        ? (inferredValue as FormValue)
        : (defaultValue ?? "");
  }

  return (
    <div className="rounded-lg border p-3">
      <FieldRenderer
        config={config}
        value={effectiveValue}
        onChange={(_key, nextValue) => {
          if (component.id === "report") {
            onChange(mergeReportValues(nextValue, inferredReports));
            return;
          }

          if (
            component.type === "multiselect" &&
            hasMeaningfulValue(inferredValue)
          ) {
            onChange(mergeMultiSelectValues(nextValue, inferredValue));
            return;
          }

          onChange(nextValue);
        }}
      />
    </div>
  );
}

function mergeMultiSelectValues(
  value: FormValue,
  inferredValue?: FormValue
): string[] {
  const explicit = normalizeStringList(value);
  const inferred = normalizeStringList(inferredValue);

  return [...new Set([...explicit, ...inferred])];
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function panelHasMeaningfulValues({
  panel,
  values,
  inferredValues,
}: {
  panel: FeaturePanelConfig;
  values: FormValues;
  inferredValues: Record<string, FormValue>;
}) {
  return getPanelFieldIds(panel).some(
    (fieldId) =>
      hasMeaningfulValue(values[fieldId]) ||
      hasMeaningfulValue(inferredValues[fieldId])
  );
}

function getActivePanelFields({
  panel,
  values,
  inferredValues,
}: {
  panel: FeaturePanelConfig;
  values: FormValues;
  inferredValues: Record<string, FormValue>;
}) {
  return getPanelFieldIds(panel).filter(
    (fieldId) =>
      hasMeaningfulValue(values[fieldId]) ||
      hasMeaningfulValue(inferredValues[fieldId])
  );
}

function getPanelFieldIds(panel: FeaturePanelConfig): string[] {
  if (panel.groups?.length) {
    return panel.groups.flatMap((group) => group.fields);
  }

  return panel.fields ?? [];
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value !== null && value !== undefined;
}

function formatFieldSummary(field: string, value: FormValue): string {
  const formatted = Array.isArray(value) ? value.join(", ") : String(value);

  return `${humanizeFieldName(field)}: ${formatted}`;
}

function humanizeFieldName(field: string): string {
  return field
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-foreground">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

function CrawlerTargetSection({
  url,
  onUrlChange,
  browserSession,
  onStartBrowserSession,
  onCaptureBrowserSession,
  isRunning,
  state,
  actions,
  values,
  onExecuteUiAction,
}: {
  url: string;

  onUrlChange: (value: string) => void;

  browserSession: BrowserSessionState;

  onStartBrowserSession: () => void;
  onCaptureBrowserSession: () => void;

  isRunning: boolean;

  state: ToolUiState;

  actions: UIComponent[];

  values: FormValues;

  onExecuteUiAction: (component: UIComponent) => void | Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Target"
        description="Enter the website you want to crawl."
      />

      <CrawlTargetInput
        value={url}
        onChange={onUrlChange}
        hasSession={Boolean(browserSession?.hasSession)}
        browserReady={Boolean(browserSession?.ready)}
        isRunning={isRunning}
        isClosingSession={Boolean(browserSession?.isClosing)}
        onCloseSession={() => void browserSession?.close()}
        isStarting={Boolean(browserSession?.isStarting)}
        isCapturing={Boolean(browserSession?.isCapturing)}
        sessionError={browserSession?.error ?? null}
        onStartBrowserSession={onStartBrowserSession}
        onCaptureBrowserSession={onCaptureBrowserSession}
        actions={
          <ToolActionBar
            components={actions}
            values={values}
            state={state}
            onExecute={onExecuteUiAction}
          />
        }
      />
    </section>
  );
}
