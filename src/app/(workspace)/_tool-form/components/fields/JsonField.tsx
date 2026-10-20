
"use client";

import type { JsonFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Braces } from "lucide-react";

/**
 * Whether text parses as JSON.
 * Empty or whitespace-only input is considered valid.
 */
function isValidJson(text: string): boolean {
  if (text.trim() === "") return true;

  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Structured JSON input widget.
 *
 * Stores raw JSON text as a string. The tool engine parses
 * it into an object or array at execution time.
 *
 * Validation is advisory and never blocks submission.
 */
export function JsonField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
}: JsonFieldProps) {
  const text = value ?? "";
  const valid = isValidJson(text);
  const canFormat = text.trim() !== "" && valid;

  const validationId = `${id}-validation`;
  const helperId = `${id}-helper`;

  const format = () => {
    if (!canFormat || disabled) return;

    try {
      onChange(
        JSON.stringify(JSON.parse(text), null, 2)
      );
    } catch {
      // Invalid JSON is left untouched.
    }
  };

  return (
    <div className="space-y-2">
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

        <Textarea
          id={id}
          value={text}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          disabled={disabled}
          aria-required={required}
          aria-invalid={!valid}
          aria-describedby={
            !valid
              ? validationId
              : placeholder
                ? helperId
                : undefined
          }
          spellCheck={false}
          className="min-h-32 resize-y font-mono text-sm"
        />

        {!valid ? (
          <p
            id={validationId}
            role="status"
            className="text-xs text-destructive"
          >
            Invalid JSON
          </p>
        ) : (
          placeholder && (
            <p
              id={helperId}
              className="text-xs text-muted-foreground"
            >
              {placeholder}
            </p>
          )
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={format}
          disabled={disabled || !canFormat}
        >
          <Braces className="size-4" aria-hidden="true" />
          Format
        </Button>
      </div>
    </div>
  );
}
