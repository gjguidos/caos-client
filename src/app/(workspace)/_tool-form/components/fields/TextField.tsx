
"use client";

import type { TextFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
}: TextFieldProps) {
  const helperId = `${id}-helper`;

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
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required}
        aria-describedby={placeholder ? helperId : undefined}
        className="w-full"
      />

      {placeholder && (
        <p
          id={helperId}
          className="text-xs text-muted-foreground"
        >
          {placeholder}
        </p>
      )}
    </div>
  );
}
