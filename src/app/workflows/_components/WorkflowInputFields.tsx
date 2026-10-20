
"use client";

import { useEffect, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  WorkflowInputField,
  WorkflowInputWidget,
} from "@/shared/lib/workflow/workflow.types";

import { readAcceptedMimes } from "@/shared/lib/workflow/workflowInputs";

/** Available widget types, in display order. */
const WIDGET_OPTIONS: ReadonlyArray<{
  value: WorkflowInputWidget;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text area" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-select" },
  { value: "object", label: "JSON" },
  { value: "file", label: "File" },
];

export interface WorkflowInputFieldsProps {
  field: WorkflowInputField;
  onChange: (patch: Partial<WorkflowInputField>) => void;

  /**
   * Namespaces generated DOM IDs.
   *
   * Each input gets a stable ID based on this prefix.
   * Call sites must supply a unique prefix.
   */
  idPrefix: string;
}

/**
 * Definition form for a workflow input.
 *
 * Supports:
 * - Identifier and label
 * - Required flag
 * - Input widget type
 * - Select/multiselect options
 * - Accepted file MIME types
 * - Optional default value
 *
 * Layout and removal controls belong to the parent panel.
 */
export function WorkflowInputFields({
  field,
  onChange,
  idPrefix,
}: Readonly<WorkflowInputFieldsProps>) {
  return (
    <>
      {/* Input identifier */}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-key`}>
          Input Identifier
        </Label>

        <Input
          id={`${idPrefix}-key`}
          type="text"
          value={field.key}
          onChange={(event) =>
            onChange({ key: event.target.value })
          }
        />
      </div>

      {/* Required flag */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-required`}
          checked={field.required ?? false}
          onCheckedChange={(checked) =>
            onChange({ required: checked === true })
          }
        />

        <Label
          htmlFor={`${idPrefix}-required`}
          className="cursor-pointer font-normal"
        >
          Required
        </Label>
      </div>

      {/* Display label */}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-label`}>
          Input Label
        </Label>

        <Input
          id={`${idPrefix}-label`}
          type="text"
          value={field.label}
          onChange={(event) =>
            onChange({ label: event.target.value })
          }
        />
      </div>

      {/* Widget type */}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>
          Input type
        </Label>

        <Select
          value={field.input}
          onValueChange={(value) =>
            onChange({
              input: value as WorkflowInputWidget,
            })
          }
        >
          <SelectTrigger
            id={`${idPrefix}-type`}
            className="w-full"
          >
            <SelectValue placeholder="Select input type" />
          </SelectTrigger>

          <SelectContent>
            {WIDGET_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Select options */}
      {(field.input === "select" ||
        field.input === "multiselect") && (
        <CommaListEditor
          id={`${idPrefix}-options`}
          label="Options (comma-separated)"
          values={(field.options ?? []).map(
            (option) => option.value
          )}
          onChange={(values) =>
            onChange({
              options: values.map((value) => ({
                value,
              })),
            })
          }
        />
      )}

      {/* File MIME types */}
      {field.input === "file" && (
        <CommaListEditor
          id={`${idPrefix}-mimes`}
          label="Accepted MIME types (comma-separated, empty = any)"
          values={
            readAcceptedMimes(field.constraints) ??
            []
          }
          onChange={(mimes) => {
            const next = {
              ...(field.constraints ?? {}),
            };

            if (mimes.length > 0) {
              next.accepted_mimes = mimes;
            } else {
              delete next.accepted_mimes;
            }

            onChange({
              constraints:
                Object.keys(next).length > 0
                  ? next
                  : null,
            });
          }}
        />
      )}

      {/* File inputs don't have meaningful defaults. */}
      {field.input !== "file" && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-default`}>
            Input default value (Optional)
          </Label>

          <Input
            id={`${idPrefix}-default`}
            type={
              field.input === "number"
                ? "number"
                : "text"
            }
            value={
              field.default === undefined ||
              field.default === null
                ? ""
                : String(field.default)
            }
            onChange={(event) => {
              const raw = event.target.value;

              onChange({
                default: raw === "" ? null : raw,
              });
            }}
          />
        </div>
      )}
    </>
  );
}

/**
 * Parse a comma-separated string into a list of
 * trimmed, unique, non-empty values.
 */
function parseCommaList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of raw.split(",")) {
    const trimmed = value.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

/**
 * Buffered editor for comma-separated values.
 *
 * The buffer intentionally retains incomplete input
 * (such as a trailing comma or space).
 *
 * This prevents controlled input rerenders from
 * removing separators while the user is typing.
 */
function CommaListEditor({
  id,
  label,
  values,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  values: ReadonlyArray<string>;
  onChange: (values: string[]) => void;
}>) {
  const canonical = values.join(", ");

  const [text, setText] = useState(canonical);

  // Only synchronize changes originating outside
  // this editor. Locally typed separators survive.
  const bufferCanonical =
    parseCommaList(text).join(", ");

  useEffect(() => {
    if (canonical !== bufferCanonical) {
      setText(canonical);
    }
  }, [canonical, bufferCanonical]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
      </Label>

      <Input
        id={id}
        type="text"
        value={text}
        onChange={(event) => {
          const raw = event.target.value;

          setText(raw);
          onChange(parseCommaList(raw));
        }}
      />
    </div>
  );
}
