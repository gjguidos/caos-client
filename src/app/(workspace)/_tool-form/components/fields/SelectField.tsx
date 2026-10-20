
"use client";

import type { SelectFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}: SelectFieldProps) {
  const selectedValue = value ?? "";

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

      <Select
        value={selectedValue}
        onValueChange={onChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-label={label}
        >
          <SelectValue placeholder="Choose an option" />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
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
  );
}
