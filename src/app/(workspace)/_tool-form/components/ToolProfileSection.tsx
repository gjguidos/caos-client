"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FormValue,
  FormValues,
  OutputProfilesConfig,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import {
  formatProfileValue,
  getProfileDefaults,
  getProfilePreview,
  humanizeFieldName,
  profileValuesEqual,
  summariseProfileValues,
} from "@/app/(workspace)/_tool-form/lib/profileValues";
import {
  normalizeReportValues,
} from "@/app/(workspace)/_roles/crawler/helpers/reportValues";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ToolProfileSectionProps = {
  title?: string;
  description?: string;
  profileField: string;
  selectedProfile: string;
  profileConfig?: OutputProfilesConfig | null;
  currentValues?: FormValues;
  effectiveReports?: string[];
  onValueChange: (field: string, value: FormValue) => void;
  onOpenConfiguration?: () => void;
};

export function ToolProfileSection({
  title = "Profile",
  description = "Choose the kind of crawl report you need.",
  profileField,
  selectedProfile,
  profileConfig,
  currentValues = {},
  effectiveReports,
  onValueChange,
  onOpenConfiguration,
}: ToolProfileSectionProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const options = profileConfig?.options ?? [];
  const controlledFields = profileConfig?.controlled_fields ?? [];

  const selectedOption =
    options.find((option) => option.value === selectedProfile) ?? options[0];

  function handleProfileChange(profileName: string) {
    onValueChange(profileField, profileName);
  }

  function resetFields(fields: string[]) {
    const defaults = getProfileDefaults(
      profileConfig,
      selectedOption?.value
    );

    if (!defaults) return;

    for (const field of fields) {
      if (defaults[field] !== undefined) {
        onValueChange(
          field,
          defaults[field] as FormValue
        );
      }
    }
  }

  if (options.length === 0) {
    return (
      <section className="agent-wizard-card space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          {title}
        </h3>

        <p className="text-sm text-destructive">
          No profiles were provided by the tool registry.
        </p>
      </section>
    );
  }

  const selectedDefaults = getProfileDefaults(
    profileConfig,
    selectedOption?.value
  );

  const effectiveValues = buildEffectiveProfileValues({
    defaults: selectedDefaults,
    currentValues,
    controlledFields,
  });

  const displayEffectiveValues =
    buildDisplayEffectiveValues({
      effectiveValues,
      effectiveReports,
    });

  const overrideRows = buildProfileOverrideRows({
    defaults: selectedDefaults,
    effectiveValues: displayEffectiveValues,
    controlledFields,
  });

  const overrideCount = overrideRows.filter(
    hasRowChanges
  ).length;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        <Select
          value={selectedOption?.value ?? ""}
          onValueChange={handleProfileChange}
        >
          <SelectTrigger className="h-auto min-h-14 w-full px-4 py-3 text-left [&>svg]:h-4 [&>svg]:w-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3 pr-2">
                <div className="min-w-0">
                  <SelectValue placeholder="Select profile" />
                </div>

                <ProfileStatusBadge
                  overrideCount={overrideCount}
                />
              </div>
            </div>
          </SelectTrigger>

          <SelectContent className="max-h-80">
            {options.map((option) => {
              const preview = getProfilePreview(
                profileConfig,
                option.value
              );

              const defaults = getProfileDefaults(
                profileConfig,
                option.value
              );

              return (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="items-start py-3"
                >
                  <div className="min-w-0 space-y-1 pr-5">
                    <span className="text-sm font-semibold text-foreground">
                      {option.label}
                    </span>

                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}

                    <ToolProfilePreview
                      preview={preview}
                      defaults={defaults}
                      previewFields={
                        profileConfig?.preview_fields
                      }
                    />
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <ToolProfileOverrideSummary
          rows={overrideRows}
        />

        <ToolProfileDetails
          rows={overrideRows}
          open={detailsOpen}
          onToggle={() =>
            setDetailsOpen((current) => !current)
          }
          onOpenConfiguration={onOpenConfiguration}
          onResetField={(field) =>
            resetFields([field])
          }
          onResetAll={() =>
            resetFields(controlledFields)
          }
        />
      </div>

      {profileConfig?.respect_user_overrides && (
        <p className="text-xs text-muted-foreground">
          Profile values prefill the form. Advanced settings
          can override them.
        </p>
      )}
    </section>
  );
}

function ProfileStatusBadge({
  overrideCount,
}: {
  overrideCount: number;
}) {
  return (
    <Badge
      variant={overrideCount > 0 ? "outline" : "secondary"}
      className={overrideCount > 0 ? "border-amber-300 text-amber-800" : ""}
    >
      {overrideCount > 0
        ? `${overrideCount} override${overrideCount === 1 ? "" : "s"}`
        : "Using preset"}
    </Badge>
  );}

type ToolProfileDetailRow = {
  field: string;
  label: string;
  currentValue: string;
  defaultValue: string | undefined;
  overridden: boolean;

  addedValues?: string[];
  removedValues?: string[];
};

function normalizeStringList(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function hasRowChanges(
  row: ToolProfileDetailRow
): boolean {
  if (row.field === "report") {
    return Boolean(
      row.addedValues?.length ||
      row.removedValues?.length
    );
  }

  return row.overridden;
}

function ToolProfileDetails({
  rows,
  open,
  onToggle,
  onOpenConfiguration,
  onResetField,
  onResetAll,
}: {
  rows: ToolProfileDetailRow[];
  open: boolean;
  onToggle: () => void;
  onOpenConfiguration?: () => void;
  onResetField: (field: string) => void;
  onResetAll: () => void;
}) {
  if (rows.length === 0) return null;

  const overrideCount = rows.filter(
    hasRowChanges
  ).length;

  const handleShow = () => {
    if (onOpenConfiguration) {
      onOpenConfiguration();
      return;
    }

    onToggle();
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-4 px-3 py-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Preset configuration
          </p>

          <p className="text-xs text-muted-foreground">
            View the settings included in this preset.
          </p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={handleShow}>
          {onOpenConfiguration ? "Show" : open ? "Hide" : "Show"}
        </Button>
      </div>

      {!onOpenConfiguration && open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <dl className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.field}
                className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-start sm:gap-3"
              >
                <dt>
                  <span className="text-xs text-muted-foreground">
                    {row.label}
                  </span>
                </dt>

                <dd className="min-w-0">
                  <p className="text-sm text-foreground break-words font-semibold">
                    {row.currentValue}
                  </p>

                  {hasRowChanges(row) &&
                    row.defaultValue !== undefined && (
                      <p className="text-xs mt-0.5 text-amber-800">
                        Overridden · profile default:{" "}
                        {row.defaultValue}
                      </p>
                    )}
                </dd>

                {hasRowChanges(row) && (
                  <Button type="button" variant="outline" size="sm" onClick={() => onResetField(row.field)}>Reset</Button>
                )}
              </div>
            ))}
          </dl>

          {overrideCount > 0 && (
            <div className="flex justify-end border-t border-border pt-3">
              <Button type="button" variant="outline" size="sm" onClick={onResetAll}>Reset all</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolProfilePreview({
  preview,
  defaults,
  previewFields,
  preferDefaults = false,
}: {
  preview?: Record<string, unknown> | null;
  defaults: Record<string, unknown> | null;
  previewFields?: string[];
  preferDefaults?: boolean;
}) {
  const source = preferDefaults
    ? defaults ?? preview
    : preview ?? defaults;

  const items = summariseProfileValues(
    source,
    previewFields
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      {items.join(" · ")}
    </p>
  );
}

function buildEffectiveProfileValues({
  defaults,
  currentValues,
  controlledFields,
}: {
  defaults: Record<string, unknown> | null;
  currentValues: Record<string, unknown>;
  controlledFields: string[];
}): Record<string, unknown> | null {
  if (!defaults) {
    return null;
  }

  const effectiveValues: Record<string, unknown> = {
    ...defaults,
  };

  for (const field of controlledFields) {
    const currentValue = currentValues[field];

    if (
      currentValue !== undefined &&
      currentValue !== null
    ) {
      effectiveValues[field] = currentValue;
    }
  }

  return effectiveValues;
}

function buildDisplayEffectiveValues({
  effectiveValues,
  effectiveReports,
}: {
  effectiveValues: Record<string, unknown> | null;
  effectiveReports?: string[];
}): Record<string, unknown> | null {
  if (!effectiveValues) {
    return null;
  }

  if (!effectiveReports) {
    return effectiveValues;
  }

  return {
    ...effectiveValues,
    report: effectiveReports,
  };
}


function buildProfileOverrideRows({
  defaults,
  effectiveValues,
  controlledFields,
}: {
  defaults: Record<string, unknown> | null;
  effectiveValues: Record<string, unknown> | null;
  controlledFields: string[];
}): ToolProfileDetailRow[] {
  if (!defaults || !effectiveValues) {
    return [];
  }

  const rows: ToolProfileDetailRow[] = [];

  for (const field of controlledFields) {
    const currentValue = effectiveValues[field];
    const defaultValue = defaults[field];

    if (
      currentValue === undefined &&
      defaultValue === undefined
    ) {
      continue;
    }

    const currentItems =
      field === "report"
        ? normalizeReportValues(currentValue)
        : [];

    const defaultItems =
      field === "report"
        ? normalizeReportValues(defaultValue)
        : [];

    const addedValues =
      field === "report"
        ? currentItems.filter(
            (item) => !defaultItems.includes(item)
          )
        : undefined;

    const removedValues =
      field === "report"
        ? defaultItems.filter(
            (item) => !currentItems.includes(item)
          )
        : undefined;

    const overridden =
      field === "report"
        ? Boolean(
            addedValues?.length ||
            removedValues?.length
          )
        : !profileValuesEqual(
            currentValue,
            defaultValue
          );

    rows.push({
      field,
      label: humanizeFieldName(field),
      currentValue: formatProfileValue(currentValue),
      defaultValue:
        defaultValue === undefined
          ? undefined
          : formatProfileValue(defaultValue),
      overridden,
      addedValues,
      removedValues,
    });
  }

  return rows;
}

function ToolProfileOverrideSummary({
  rows,
}: {
  rows: ToolProfileDetailRow[];
}) {
  const changedRows = rows.filter(
    hasRowChanges
  );

  if (changedRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md bg-muted px-3 py-2">
      {changedRows.map((row) => {
        if (row.field === "report") {
          return (
            <div
              key={row.field}
              className="space-y-1"
            >
              {Boolean(row.addedValues?.length) && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Reports added:
                  </span>{" "}
                  {row.addedValues?.join(", ")}
                </p>
              )}

              {Boolean(row.removedValues?.length) && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Reports removed:
                  </span>{" "}
                  {row.removedValues?.join(", ")}
                </p>
              )}
            </div>
          );
        }

        return (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {row.label}:
            </span>{" "}
            {row.defaultValue !== undefined
              ? `${row.defaultValue} → ${row.currentValue}`
              : row.currentValue}
          </p>
        );
      })}
    </div>
  );
}