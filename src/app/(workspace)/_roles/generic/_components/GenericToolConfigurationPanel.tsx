"use client";

import { useMemo, useState, type SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import type {
  FormValue,
  FormValues,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { ToolAdvancedSettingsModal } from "@/app/(workspace)/_tool-form/components/ToolAdvancedSettingsModal";
import { ToolProfileSection } from "@/app/(workspace)/_tool-form/components/ToolProfileSection";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import {
  formatProfileValue,
  hasMeaningfulValue,
  humanizeFieldName,
} from "@/app/(workspace)/_tool-form/lib/profileValues";

export type GenericToolConfigurationPanelProps = {
  tool: EnrichedTool | null;

  values: FormValues;
  setValue: (key: string, value: FormValue) => void;

  formError: string | null;
  executionError: string | null;

  isRunning: boolean;
  canExecute: boolean;
  hasResultOrLogs: boolean;

  onSubmit: (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => void;
  onReset: () => void;
};

export function GenericToolConfigurationPanel({
  tool,
  values,
  setValue,
  formError,
  executionError,
  isRunning,
  canExecute,
  hasResultOrLogs,
  onSubmit,
  onReset,
}: GenericToolConfigurationPanelProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const components = useMemo(() => tool?.ui ?? [], [tool]);
  const profileConfig = useMemo(() => tool?.uiOutputProfiles ?? null, [tool]);
  const chatInput = tool?.uiChatInput ?? null;

  const primaryInputComponent = useMemo(
    () => resolvePrimaryInputComponent(components, chatInput?.id),
    [components, chatInput?.id]
  );

  const selectedProfile = String(
    values.output_profile ?? profileConfig?.default ?? ""
  );

  const hasProfiles = Boolean(
    profileConfig?.profiles || profileConfig?.options?.length
  );

  const hasFilters = components.some(
    (component) => String(component.group ?? "") === "Optional"
  );

  const hiddenFieldIds = useMemo(
    () =>
      [
        primaryInputComponent?.id,
        "output_profile",
        "browser_session_id",
        "start_browser_session",
      ].filter(Boolean) as string[],
    [primaryInputComponent?.id]
  );

  return (
    <form
      onSubmit={onSubmit}
      className="min-h-0 overflow-y-auto rounded-lg border p-5"
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold">
            {tool?.label ?? "Tool configuration"}
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            {tool?.description ??
              "Configure and run this tool-backed operation."}
          </p>
        </section>

        {primaryInputComponent && (
          <GenericPrimaryInputSection
            component={primaryInputComponent}
            value={values[primaryInputComponent.id]}
            onValueChange={(value) => setValue(primaryInputComponent.id, value)}
          />
        )}

        {hasProfiles && profileConfig && (
          <ToolProfileSection
            title="Profile"
            description="Choose a preset configuration for this operation."
            profileField="output_profile"
            selectedProfile={selectedProfile}
            profileConfig={profileConfig}
            currentValues={values}
            onValueChange={setValue}
          />
        )}

        {hasFilters && (
          <GenericSummarySection
            title="Search & filters"
            summary={buildFilterSummary(values)}
            buttonLabel="Configure filters"
            onOpen={() => setFiltersOpen(true)}
          />
        )}

        <GenericSummarySection
          title="Advanced settings"
          summary={buildAdvancedSummary(values)}
          buttonLabel="Configure advanced options"
          onOpen={() => setAdvancedOpen(true)}
        />

        {!tool && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No form tool is available for this agent.
          </div>
        )}

        {(formError || executionError) && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError || executionError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={!canExecute} className="flex-1">
            {isRunning ? "Running..." : "Run"}
          </Button>

          {hasResultOrLogs && (
            <Button type="button" onClick={onReset} disabled={isRunning}>
              Reset
            </Button>
          )}
        </div>
      </div>

      <ToolAdvancedSettingsModal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Search & filters"
        description="Narrow this operation by optional filters."
        components={components}
        values={values}
        onValueChange={setValue}
        includeGroups={["Optional"]}
        hiddenFieldIds={hiddenFieldIds}
      />

      <ToolAdvancedSettingsModal
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        title="Advanced settings"
        description="Override defaults and tune execution."
        components={components}
        values={values}
        onValueChange={setValue}
        profileConfig={profileConfig}
        selectedProfile={selectedProfile}
        excludeGroups={["Optional"]}
        hiddenFieldIds={hiddenFieldIds}
      />
    </form>
  );
}

function GenericPrimaryInputSection({
  component,
  value,
  onValueChange,
}: {
  component: UIComponent;
  value: FormValue | undefined;
  onValueChange: (value: FormValue) => void;
}) {
  const props = component.props ?? {};

  const label = String(props.label ?? humanizeFieldName(component.id));

  const helperText =
    typeof props.helperText === "string" ? props.helperText : undefined;

  const placeholder =
    typeof props.placeholder === "string" ? props.placeholder : "";

  return (
    <section className="rounded-lg border bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">{label}</h2>

        {helperText && (
          <p className="mt-1 text-sm text-gray-600">{helperText}</p>
        )}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium">{label}</span>

        <input
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </label>
    </section>
  );
}

function GenericSummarySection({
  title,
  summary,
  buttonLabel,
  onOpen,
}: {
  title: string;
  summary: string;
  buttonLabel: string;
  onOpen: () => void;
}) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{summary}</p>
      </div>

      <div className="mt-4">
        <Button type="button" onClick={onOpen}>
          {buttonLabel}
        </Button>
      </div>
    </section>
  );
}

function resolvePrimaryInputComponent(
  components: UIComponent[],
  chatInputId?: string | null
): UIComponent | null {
  if (chatInputId) {
    const match = components.find((component) => component.id === chatInputId);

    if (match) {
      return match;
    }
  }

  return (
    components.find((component) =>
      component.render_paths?.includes("chat_input")
    ) ??
    components.find((component) => component.group === "Target") ??
    components.find((component) => component.widget === "TextField") ??
    null
  );
}

function buildFilterSummary(values: FormValues): string {
  const active = Object.entries(values)
    .filter(([key, value]) => {
      if (!hasMeaningfulValue(value)) {
        return false;
      }

      return (
        key.includes("filter") ||
        key.includes("find") ||
        key.includes("search") ||
        key.includes("media") ||
        key.includes("document")
      );
    })
    .map(
      ([key, value]) =>
        `${humanizeFieldName(key)}: ${formatProfileValue(value)}`
    );

  return active.length > 0 ? active.join(" · ") : "No filters configured.";
}

function buildAdvancedSummary(values: FormValues): string {
  const items: string[] = [];

  if (hasMeaningfulValue(values.mode)) {
    items.push(`Mode ${formatProfileValue(values.mode)}`);
  }

  if (hasMeaningfulValue(values.max_pages)) {
    items.push(`${formatProfileValue(values.max_pages)} pages`);
  }

  if (hasMeaningfulValue(values.max_depth)) {
    items.push(`Depth ${formatProfileValue(values.max_depth)}`);
  }

  return items.length > 0 ? items.join(" · ") : "Using defaults.";
}
