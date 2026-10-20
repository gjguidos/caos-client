
"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import type {
  FieldOption,
  PillGroupProps as PillGroupWidgetProps,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

interface PillGroupComponentProps {
  component: UIComponent;
  value?: string;
  onChange: (value: string) => void;
}

export function PillGroup({
  component,
  value,
  onChange,
}: PillGroupComponentProps) {
  const options =
    (component.props as unknown as PillGroupWidgetProps).options ?? [];

  const firstOptionValue = options[0]?.value;

  useEffect(() => {
    if (firstOptionValue !== undefined && !value) {
      onChange(firstOptionValue);
    }
  }, [firstOptionValue, value, onChange]);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Tool mode"
    >
      {options.map((option: FieldOption) => {
        const isSelected = value === option.value;
        const label = option.label ?? option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className="h-7 rounded-full px-3 text-xs font-medium"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
