
"use client";

import type {
  BaseWidgetProps,
  DynamicFormRendererProps,
  FieldConfig,
  FieldCondition,
  FormScalarValue,
  FormValue,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { slugifyString } from "@/shared/lib/slugifyString";
import { FieldRenderer } from "./FieldRenderer";
import { uiComponentToFieldConfig } from "./lib/uiComponentToFieldConfig";

interface GroupedUIComponents {
  [groupName: string]: UIComponent[];
}

function groupUIComponentsByGroup(
  components: UIComponent[]
): GroupedUIComponents {
  return components.reduce<GroupedUIComponents>((acc, component) => {
    if (!component.group) return acc;

    const group = component.group;

    if (!acc[group]) {
      acc[group] = [];
    }

    acc[group].push(component);
    return acc;
  }, {});
}

function getFieldValue(
  field: FieldConfig,
  values: FormValues
): FormValue {
  return values[field.key];
}

function isEmptyValue(value: FormValue): boolean {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isScalarValue(
  value: FormValue
): value is FormScalarValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function matchesCondition(
  condition: FieldCondition,
  values: FormValues
): boolean {
  const field = condition.field ?? condition.state;
  const currentValue = values[field];

  switch (condition.operator) {
    case "empty":
      return isEmptyValue(currentValue);

    case "not_empty":
      return !isEmptyValue(currentValue);

    case "equals":
      return (
        isScalarValue(currentValue) &&
        !Array.isArray(condition.value) &&
        currentValue === condition.value
      );

    case "not_equals":
      return (
        !isScalarValue(currentValue) ||
        Array.isArray(condition.value) ||
        currentValue !== condition.value
      );

    case "in":
      return (
        isScalarValue(currentValue) &&
        Array.isArray(condition.value) &&
        condition.value.includes(currentValue)
      );

    case "not_in":
      return (
        !isScalarValue(currentValue) ||
        !Array.isArray(condition.value) ||
        !condition.value.includes(currentValue)
      );

    default:
      return false;
  }
}

export function DynamicFormRenderer({
  uiComponents,
  groupLabelMap,
  values,
  onChange,
  onAction,
  actionStatuses,
  actionMessages,
  renderField,
  defaultCollapsed = false,
}: DynamicFormRendererProps) {
  if (!uiComponents || uiComponents.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No properties to configure
      </div>
    );
  }

  const sorted = [...uiComponents].sort(
    (a, b) =>
      (a.slot_order ?? Infinity) -
      (b.slot_order ?? Infinity)
  );

  const grouped = groupUIComponentsByGroup(sorted);
  const groupOrder = Object.keys(grouped);

  const defaultOpenGroups = groupOrder
    .filter((groupName, index) => {
      const components = grouped[groupName];

      const groupLabel =
        components.find((component) => component.groupLabel)
          ?.groupLabel ??
        groupLabelMap?.[groupName] ??
        groupName;

      return defaultCollapsed
        ? groupLabel === "Input"
        : index < 2;
    })
    .map((groupName) => `group-${slugifyString(groupName)}`);

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpenGroups}
      className="flex flex-col gap-2"
    >
      {groupOrder.map((groupName) => {
        const components = grouped[groupName];
        const groupId = `group-${slugifyString(groupName)}`;

        const groupLabel =
          components.find((component) => component.groupLabel)
            ?.groupLabel ??
          groupLabelMap?.[groupName] ??
          groupName;

        return (
          <AccordionItem
            key={groupName}
            value={groupId}
            className="rounded-lg border border-border px-4"
          >
            <AccordionTrigger className="py-3 text-left text-sm font-medium hover:no-underline">
              {groupLabel}
            </AccordionTrigger>

            <AccordionContent className="pb-4">
              <div className="flex flex-col gap-3">
                {components.map((component) => {
                  const fieldConfig =
                    uiComponentToFieldConfig(component);

                  if (!fieldConfig) return null;

                  if (fieldConfig === "unimplemented") {
                    const props =
                      component.props as BaseWidgetProps;

                    const label =
                      props?.label ?? component.id;

                    return (
                      <div
                        key={component.id}
                        className="rounded-md border border-border bg-muted/50 p-3"
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {label}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Widget{" "}
                          <strong>{component.widget}</strong>{" "}
                          not implemented yet
                        </p>
                      </div>
                    );
                  }

                  const disabledCondition =
                    fieldConfig.disabledWhen?.find(
                      (condition) =>
                        matchesCondition(condition, values)
                    );

                  const disabled =
                    Boolean(fieldConfig.disabled) ||
                    Boolean(disabledCondition);

                  const helperText =
                    disabledCondition?.message ??
                    fieldConfig.helperText;

                  const value = getFieldValue(
                    fieldConfig,
                    values
                  );

                  if (fieldConfig.type === "action") {
                    return (
                      <FieldRenderer
                        key={component.id}
                        config={{
                          ...fieldConfig,
                          disabled,
                          helperText,
                          status:
                            actionStatuses?.[component.id],
                          statusMessage:
                            actionMessages?.[component.id],
                        }}
                        value={value}
                        onChange={onChange}
                        onAction={() => {
                          void onAction?.(component);
                        }}
                      />
                    );
                  }

                  const defaultField = (
                    <FieldRenderer
                      config={{
                        ...fieldConfig,
                        disabled,
                        helperText,
                      }}
                      value={value}
                      onChange={onChange}
                    />
                  );

                  return (
                    <div key={component.id}>
                      {renderField
                        ? renderField({
                            component,
                            value,
                            onChange,
                            defaultField,
                          })
                        : defaultField}
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
