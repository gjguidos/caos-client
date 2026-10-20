
"use client";

import { Button } from "@/components/ui/button";

import type {
  FieldOption,
  PillGroupProps as PillGroupWidgetProps,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";

interface ResponseActionBarProps {
  component: UIComponent;
  value?: string;
  onChange: (value: string) => void;
}

export function ResponseActionBar({
  component,
  value,
  onChange,
}: ResponseActionBarProps) {
  const options =
    (component.props as unknown as PillGroupWidgetProps).options ?? [];

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Response actions"
    >
      {options.map((option: FieldOption) => {
        const selected = value === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={selected ? "secondary" : "outline"}
            size="sm"
            className="h-7 rounded-full px-3 text-xs font-medium"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
          >
            {option.label ?? option.value}
          </Button>
        );
      })}
    </div>
  );
}
