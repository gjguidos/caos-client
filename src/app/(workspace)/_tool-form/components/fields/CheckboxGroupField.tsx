
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { CheckboxGroupFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";

export function CheckboxGroupField({
  id,
  label,
  value = [],
  onChange,
  options,
  required = false,
  disabled = false,
}: CheckboxGroupFieldProps) {
  const selectedValues = value ?? [];

  const handleCheckboxChange = (
    optionValue: string,
    checked: boolean
  ) => {
    if (checked) {
      onChange(
        selectedValues.includes(optionValue)
          ? selectedValues
          : [...selectedValues, optionValue]
      );
    } else {
      onChange(
        selectedValues.filter(
          (value) => value !== optionValue
        )
      );
    }
  };

  return (
    <fieldset
      className="m-0 min-w-0 border-0 p-0"
      disabled={disabled}
    >
      <legend className="mb-3 text-sm font-medium text-foreground">
        {label}

        {required && (
          <span
            className="ml-1 text-destructive"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </legend>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {options.map((option) => {
          const checkboxId = `${id}-${option.value}`;

          return (
            <div
              key={option.value}
              className="flex min-w-0 items-start gap-2"
            >
              <Checkbox
                id={checkboxId}
                value={option.value}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(
                    option.value,
                    checked === true
                  )
                }
                disabled={disabled}
                className="mt-0.5"
              />

              <Label
                htmlFor={checkboxId}
                className="min-w-0 cursor-pointer text-sm font-normal leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
