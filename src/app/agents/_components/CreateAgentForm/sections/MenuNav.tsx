"use client";

import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import {
  MENU_META,
  MENU_ORDER,
  type MenuSection,
  type StepStatus,
} from "./wizardSteps";

interface MenuNavProps {
  settings?: boolean;
  selected: MenuSection;
  onSelect: (sec: MenuSection) => void;
  className?: string;

  /** Marker per step. Steps left out render as neutral. */
  status?: Partial<Record<MenuSection, StepStatus>>;
}

/**
 * Navigation rail for the agent configuration wizard.
 *
 * Displays:
 * - Numbered configuration steps
 * - Active step
 * - Completed steps
 * - Steps requiring attention
 */
export default function MenuNav({
  settings = false,
  selected,
  onSelect,
  className,
  status = {},
}: MenuNavProps) {
  return (
    <nav className={cn("flex flex-col", className)} aria-label="Configuration">
      <p className="px-5 pb-3 pt-6 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Configuration
      </p>

      <ul className="flex flex-col gap-0.5 px-3">
        {MENU_ORDER.map((section, index) => {
          const active = section === selected;
          const meta = MENU_META[section];

          const state = status[section] ?? "neutral";

          const done = state === "done";
          const attention = state === "attention";

          const markerClass = active
            ? "bg-primary text-primary-foreground"
            : done
              ? "border-[1.5px] border-primary text-primary"
              : "border-[1.5px] border-border text-muted-foreground";

          return (
            <li key={section}>
              <button
                type="button"
                onClick={() => onSelect(section)}
                aria-current={active ? (settings ? "page" : "step") : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-left",
                  "transition-colors",
                  "focus-visible:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  "focus-visible:ring-offset-2",
                  active ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                {/* Active step indicator */}
                {active && (
                  <span
                    className="absolute inset-y-3 left-0 w-[3px] rounded-r-sm bg-primary"
                    aria-hidden="true"
                  />
                )}

                {/* Step number / completed marker */}
                {!settings && (
                  <span
                    className={cn(
                      "flex size-[30px] shrink-0 items-center justify-center rounded-full",
                      "text-[13px] font-bold",
                      markerClass
                    )}
                    aria-hidden="true"
                  >
                    {done && !active ? <Check className="size-4" /> : index + 1}
                  </span>
                )}

                {/* Step label and description */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-primary" : "text-foreground"
                    )}
                  >
                    {meta.label}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {meta.sub}
                  </span>
                </span>

                {/* Attention indicator */}
                {attention && (
                  <span
                    className="size-2 shrink-0 rounded-full bg-destructive"
                    role="img"
                    aria-label={`${meta.label} needs attention`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
