
"use client";

import { useEffect, useState } from "react";

import type { NumberFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Sanitize numeric input while preserving intermediate
 * editing states such as "-", ".", and "12.".
 */
function sanitizeNumberDraft(input: string): string {
  const negative = input.startsWith("-");

  const [integer = "", ...fractionParts] = input
    .replace(/-/g, "")
    .split(".");

  const wholeDigits = integer.replace(/\D/g, "");
  const fractionDigits = fractionParts
    .join("")
    .replace(/\D/g, "");

  const decimal = input.includes(".")
    ? `.${fractionDigits}`
    : "";

  return `${negative ? "-" : ""}${wholeDigits}${decimal}`;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  step,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(
    value === undefined ? "" : String(value)
  );

  const [hasInteracted, setHasInteracted] = useState(false);

  // Synchronize external form updates without overwriting
  // equivalent draft representations such as "12.0".
  useEffect(() => {
    setDraft((current) => {
      if (value === undefined) {
        return current === "" ? current : "";
      }

      if (
        current !== "" &&
        /^-?(?:\d+)?(?:\.\d*)?$/.test(current) &&
        Number(current) === value
      ) {
        return current;
      }

      return String(value);
    });
  }, [value]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = sanitizeNumberDraft(
      event.target.value
    );

    setHasInteracted(true);
    setDraft(inputValue);

    if (inputValue === "") {
      onChange(undefined);
      return;
    }

    // Keep incomplete drafts visible but only publish
    // complete numeric values to the parent form.
    if (
      !/^-?(?:\d+)?(?:\.\d*)?$/.test(inputValue) ||
      !/\d/.test(inputValue)
    ) {
      return;
    }

    onChange(Number(inputValue));
  };

  const isIncompleteDraft =
    draft !== "" &&
    !/^-?(?:\d+)(?:\.\d*)?$/.test(draft);

  const visibleError =
    isIncompleteDraft ||
    (value === undefined && !hasInteracted)
      ? null
      : error;

  const validationId = `${id}-validation`;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-sm font-medium"
      >
        {label}

        {required && (
          <span
            className="ml-1 text-destructive"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </Label>

      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required}
        aria-invalid={Boolean(visibleError)}
        aria-describedby={
          visibleError ? validationId : undefined
        }
        className="w-full"
        {...(min !== undefined && { min })}
        {...(max !== undefined && { max })}
        {...(step !== undefined && { step })}
      />

      {visibleError && (
        <p
          id={validationId}
          className="text-xs text-destructive"
          role="alert"
        >
          {visibleError}
        </p>
      )}
    </div>
  );
}
