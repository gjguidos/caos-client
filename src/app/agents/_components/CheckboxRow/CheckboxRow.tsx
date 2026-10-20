"use client";

import { Checkbox } from "@/app/agents/_components/Checkbox/Checkbox";
import { InfoTooltipButton } from "@/shared/components/InfoTooltipButton/InfoTooltipButton";
import { cn } from "@/shared/lib/utils";
import type { ReactNode } from "react";

interface CheckboxRowProps {
  /** Ties the checkbox to the label; must be unique on the page. */
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** The row's visible name, and the basis of the info button's label. */
  title: string;
  /** Explanation shown behind an info button. No button when absent. */
  info?: string | null;
  /** Sits outside the label so it stays clickable, e.g. an action button. */
  trailing?: ReactNode;
  /** Extra content inside the label, under the title. */
  children?: ReactNode;
  className?: string;
}

/**
 * One selectable entry in a picker list (tools, workflows).
 *
 * Holds the alignment contract between the checkbox and the title: `mt-2` and
 * `min-h-8` are a matched pair, so rows stay aligned whether or not they carry
 * an info button. Change them together or not at all.
 */
export function CheckboxRow({
  id,
  checked,
  onCheckedChange,
  title,
  info,
  trailing,
  children,
  className,
}: Readonly<CheckboxRowProps>) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md px-3 py-2 transition-colors",
        checked ? "bg-semantic-informative/10" : "hover:bg-neutral-2",
        className
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value: boolean) => onCheckedChange(!!value)}
        className="mt-2"
      />
      <label htmlFor={id} className="min-w-0 flex-1">
        <div className="flex min-h-8 items-center gap-1.5">
          <span className="truncate text-sm font-medium leading-5">
            {title}
          </span>
          {info && (
            <InfoTooltipButton label={`${title} info`} description={info} />
          )}
        </div>
        {children}
      </label>
      {trailing}
    </div>
  );
}
