
"use client";

import type { ReactNode } from "react";
import { Link2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FormValue } from "@/app/(workspace)/_tool-form/toolForm.types";

import { mimesOverlap } from "@/shared/lib/mime";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { readAcceptedMimes } from "@/shared/lib/workflow/workflowInputs";

import type { ToolOutputType } from "@/store/slices/registry/toolsSlice";

import {
  buildInputReference,
  buildOutputReference,
  isWholeReference,
  parseReferences,
  type Reference,
} from "@/shared/lib/workflow/references";

import { isOutputCompatible } from "./outputTypes";
import type { OutputSource } from "./types";

export interface BoundReferenceControlProps {
  label: string;
  value: FormValue;

  inputs: ReadonlyArray<WorkflowInputField>;
  outputSources: ReadonlyArray<OutputSource>;

  /** Expected output type, used for advisory warnings. */
  expectedType?: ToolOutputType;

  /** MIME types accepted by a consuming file slot. */
  slotAcceptedMimes?: string[];

  /** Display a required indicator while unbound. */
  required?: boolean;

  /** Message when no compatible source candidates exist. */
  emptyHint?: string;

  /** Write a reference token or clear the value. */
  onChange: (value: string | undefined) => void;

  /** Ensure dependency when binding to an upstream output. */
  onBindOutput: (producerStepId: string) => void;
}

/**
 * Reference binding control.
 *
 * When bound:
 * - Displays a source reference pill
 * - Allows unlinking the complete reference
 *
 * When unbound:
 * - Offers workflow inputs
 * - Offers upstream step outputs
 * - Shows advisory compatibility warnings
 *
 * Callers control which sources are eligible.
 */
export function BoundReferenceControl({
  label,
  value,
  inputs,
  outputSources,
  expectedType,
  slotAcceptedMimes,
  required,
  emptyHint = "No upstream outputs yet — connect a step that declares outputs before this one to pipe its output in.",
  onChange,
  onBindOutput,
}: Readonly<BoundReferenceControlProps>) {
  const str =
    typeof value === "string" ? value : "";

  // Only a complete reference counts as one binding.
  // Mixed expressions must not be unlinked as a whole.
  const bound = isWholeReference(value);

  const showRequired = Boolean(required) && !bound;

  if (bound) {
    const reference = parseReferences(str)[0];

    const chipLabel = describeReference(
      reference,
      inputs,
      outputSources
    );

    return (
      <Field label={label}>
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-2 py-1.5">
          <Link2
            className="size-3.5 shrink-0 text-primary"
            aria-hidden="true"
          />

          <span
            className="min-w-0 flex-1 truncate font-mono text-xs text-foreground"
            title={str}
          >
            {chipLabel}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Unlink ${label}`}
            title={`Unlink ${label}`}
            onClick={() => onChange("")}
            className="size-6 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X
              className="size-3.5"
              aria-hidden="true"
            />
          </Button>
        </div>
      </Field>
    );
  }

  /*
   * A flat choice list ensures that IDs and output keys
   * are never parsed out of encoded option strings.
   */
  const inputChoices = inputs.map((input) => ({
    label: `inputs · ${
      input.label?.trim() || input.key
    }${
      mimesOverlap(
        readAcceptedMimes(input.constraints),
        slotAcceptedMimes
      )
        ? ""
        : " ⚠"
    }`,
    apply: () =>
      onChange(buildInputReference(input.key)),
  }));

  const outputChoices = outputSources.flatMap(
    (source) =>
      source.outputs.map((output) => ({
        label: `${source.label} · ${output.label} (${output.type})${
          isOutputCompatible(
            expectedType,
            output.type
          )
            ? ""
            : " ⚠"
        }`,
        apply: () => {
          onBindOutput(source.stepId);

          onChange(
            buildOutputReference(
              source.stepId,
              output.key
            )
          );
        },
      }))
  );

  const choices = [
    ...inputChoices,
    ...outputChoices,
  ];

  return (
    <Field
      label={label}
      required={showRequired}
    >
      {choices.length > 0 ? (
        <Select
          value=""
          onValueChange={(value) => {
            const index = Number(value);
            choices[index]?.apply();
          }}
        >
          <SelectTrigger
            className="w-full"
            aria-label={`Link ${label} to a source`}
          >
            <SelectValue placeholder="Select a source…" />
          </SelectTrigger>

          <SelectContent>
            {inputChoices.length > 0 && (
              <SelectGroup>
                <SelectLabel>
                  Workflow inputs
                </SelectLabel>

                {inputChoices.map(
                  (choice, index) => (
                    <SelectItem
                      key={`input-${index}`}
                      value={String(index)}
                    >
                      {choice.label}
                    </SelectItem>
                  )
                )}
              </SelectGroup>
            )}

            {outputChoices.length > 0 && (
              <SelectGroup>
                <SelectLabel>
                  Steps
                </SelectLabel>

                {outputChoices.map(
                  (choice, index) => (
                    <SelectItem
                      key={`output-${index}`}
                      value={String(
                        inputChoices.length + index
                      )}
                    >
                      {choice.label}
                    </SelectItem>
                  )
                )}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-xs text-muted-foreground">
          {emptyHint}
        </p>
      )}
    </Field>
  );
}

/**
 * Advisory marker for fields requiring a binding.
 */
export function RequiredMarker() {
  return (
    <span className="text-xs font-medium text-destructive">
      ✱ Required
    </span>
  );
}

/**
 * Shared layout for a binding field.
 */
function Field({
  label,
  required,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {label}
        </span>

        {required && <RequiredMarker />}
      </span>

      {children}
    </div>
  );
}

/**
 * Resolve a human-readable label for a reference.
 *
 * Workflow input:
 *   inputs · <label>
 *
 * Step output:
 *   <step> · <output>
 *
 * Unknown token:
 *   raw reference
 */
function describeReference(
  ref: Reference | undefined,
  inputs: ReadonlyArray<WorkflowInputField>,
  outputSources: ReadonlyArray<OutputSource>
): string {
  if (!ref) {
    return "reference";
  }

  if (ref.kind === "input") {
    const input = inputs.find(
      (item) => item.key === ref.key
    );

    return `inputs · ${
      input?.label?.trim() || ref.key
    }`;
  }

  if (ref.kind === "output") {
    const source = outputSources.find(
      (item) => item.stepId === ref.key
    );

    if (!source) {
      return ref.key ?? "";
    }

    const output = source.outputs.find(
      (item) => item.key === ref.outputKey
    );

    return output
      ? `${source.label} · ${output.label}`
      : source.label;
  }

  return ref.raw;
}
