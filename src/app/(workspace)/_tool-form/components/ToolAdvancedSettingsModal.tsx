
"use client";

import { useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type {
  FormValue,
  UIComponent,
  ToolAdvancedSettingsModalProps,
} from "@/app/(workspace)/_tool-form/toolForm.types";

import { FieldRenderer } from "@/app/(workspace)/_tool-form/FieldRenderer";
import { uiComponentToFieldConfig } from "@/app/(workspace)/_tool-form/lib/uiComponentToFieldConfig";

import {
  formatProfileValue,
  getProfileDefaults,
  hasMeaningfulValue,
  humanizeFieldName,
  profileValuesEqual,
} from "@/app/(workspace)/_tool-form/lib/profileValues";

import { mergeReportValues } from "@/app/(workspace)/_roles/crawler/helpers/reportValues";

export function ToolAdvancedSettingsModal({
  open,
  onOpenChange,
  title = "Advanced settings",
  description = "Tune the generated configuration before running the tool.",
  components,
  values,
  onValueChange,
  profileConfig,
  selectedProfile,
  hiddenFieldIds = [],
  inferredReports = [],
  inferredValues = {},
  includeGroups,
  excludeGroups,
}: ToolAdvancedSettingsModalProps) {
  const controlledFields = profileConfig?.controlled_fields ?? [];
  const selectedDefaults = getProfileDefaults(profileConfig, selectedProfile);

  const visibleComponents = useMemo(() => {
    return components
      .filter((component) => !component.hidden)
      .filter((component) => !hiddenFieldIds.includes(component.id))
      .filter((component) => component.type !== "action")
      .filter((component) => component.widget !== "HiddenField")
      .filter(
        (component) =>
          !includeGroups || includeGroups.includes(component.group ?? "")
      )
      .filter((component) => !excludeGroups?.includes(component.group ?? ""))
      .sort((left, right) => {
        const groupCompare = String(left.group ?? "").localeCompare(
          String(right.group ?? "")
        );

        if (groupCompare !== 0) {
          return groupCompare;
        }

        return (left.slot_order ?? 0) - (right.slot_order ?? 0);
      });
  }, [components, hiddenFieldIds, includeGroups, excludeGroups]);

  const profileControlled = visibleComponents.filter((component) =>
    controlledFields.includes(component.id)
  );

  const runtimeAndOther = visibleComponents.filter(
    (component) => !controlledFields.includes(component.id)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {profileControlled.length > 0 && (
            <SettingsSection
              title="Profile-controlled settings"
              description="These values are prefilled by the selected profile. Changes here become overrides."
            >
              <div className="grid gap-4">
                {profileControlled.map((component) => (
                  <ToolAdvancedField
                    key={component.id}
                    component={component}
                    value={values[component.id]}
                    inferredValue={inferredValues[component.id]}
                    inferredReports={inferredReports}
                    defaultValue={selectedDefaults?.[component.id]}
                    profileControlled
                    onChange={(value) => onValueChange(component.id, value)}
                  />
                ))}
              </div>
            </SettingsSection>
          )}

          {runtimeAndOther.length > 0 && (
            <SettingsSection
              title="Other advanced settings"
              description="These settings are not controlled by the selected profile."
            >
              <div className="grid gap-4">
                {runtimeAndOther.map((component) => (
                  <ToolAdvancedField
                    key={component.id}
                    component={component}
                    value={values[component.id]}
                    inferredValue={inferredValues[component.id]}
                    inferredReports={inferredReports}
                    defaultValue={selectedDefaults?.[component.id]}
                    profileControlled={false}
                    onChange={(value) => onValueChange(component.id, value)}
                  />
                ))}
              </div>
            </SettingsSection>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t px-5 py-4">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>

        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function ToolAdvancedField({
  component,
  value,
  inferredValue,
  inferredReports,
  defaultValue,
  profileControlled,
  onChange,
}: {
  component: UIComponent;
  value: FormValue;
  inferredValue?: FormValue;
  inferredReports: string[];
  defaultValue: FormValue;
  profileControlled: boolean;
  onChange: (value: FormValue) => void;
}) {
  const props = component.props ?? {};
  const declaredDefault = props.defaultValue as FormValue | undefined;

  const hasUserValue = hasMeaningfulValue(value);
  const hasInferredValue =
    !hasUserValue && hasMeaningfulValue(inferredValue);

  let effectiveValue: FormValue;

  if (component.id === "report") {
    effectiveValue = mergeReportValues(
      hasUserValue ? value : defaultValue,
      inferredReports
    );
  } else {
    effectiveValue = hasUserValue
      ? value
      : hasInferredValue
        ? (inferredValue as FormValue)
        : hasMeaningfulValue(defaultValue)
          ? defaultValue
          : (declaredDefault ?? "");
  }

  const overridden =
    profileControlled &&
    hasUserValue &&
    hasMeaningfulValue(defaultValue) &&
    !profileValuesEqual(value, defaultValue);

  const fieldConfig = uiComponentToFieldConfig(component);

  if (!fieldConfig) {
    return null;
  }

  if (fieldConfig === "unimplemented") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-semibold text-foreground">
          {humanizeFieldName(component.id)}
        </p>

        <p className="text-xs text-muted-foreground">
          Widget <strong>{component.widget}</strong> not implemented yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      {(profileControlled || hasInferredValue) && (
        <div className="mb-2 flex flex-wrap justify-end gap-2">
          {hasInferredValue && (
            <Badge variant="secondary" className="font-normal">
              Inferred from search
            </Badge>
          )}

          {profileControlled && (
            <Badge
              variant={overridden ? "outline" : "secondary"}
              className={
                overridden
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "font-normal"
              }
            >
              {overridden ? "Overridden" : "From profile"}
            </Badge>
          )}
        </div>
      )}

      <FieldRenderer
        config={{
          ...fieldConfig,
          label:
            fieldConfig.label ||
            humanizeFieldName(component.id),
        }}
        value={effectiveValue}
        onChange={(_key, nextValue) => {
          if (component.id === "report") {
            onChange(
              mergeReportValues(nextValue, inferredReports)
            );
            return;
          }

          onChange(nextValue);
        }}
      />

      {component.id === "report" && inferredReports.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {inferredReports.join(", ")}{" "}
          {inferredReports.length === 1 ? "is" : "are"}{" "}
          inferred from the search criteria.
        </p>
      )}

      {overridden && (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-amber-700">
            Profile default: {formatProfileValue(defaultValue)}
          </span>

          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => onChange(defaultValue)}
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
