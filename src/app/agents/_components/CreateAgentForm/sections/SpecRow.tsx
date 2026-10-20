
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import type { Provenance } from "../draftStatus";

/**
 * One line of the agent's specification sheet.
 *
 * The left gutter indicates where the value came from:
 *
 * - set: solid primary-colored marker
 * - inherited: subtle solid marker
 * - empty: dashed marker
 *
 * This keeps explicitly selected values visually
 * distinct from defaults and missing values.
 */
export function SpecRow({
  label,
  value,
  provenance,
  mono = false,
  onActivate,
  trailing,
}: Readonly<{
  label: string;
  value: ReactNode;
  provenance: Provenance;

  /** Machine names, registry keys and model IDs use monospace. */
  mono?: boolean;

  /** Makes the value clickable, e.g. to open a preview dialog. */
  onActivate?: () => void;

  trailing?: ReactNode;
}>) {
  const marker = {
    set: "bg-primary",
    inherited: "bg-muted-foreground/40",
    empty: "border-l-2 border-dashed border-muted-foreground/50",
  }[provenance];

  const valueClass = cn(
    "block max-w-full truncate text-right text-xs",
    mono && "font-mono",
    provenance === "empty"
      ? "text-muted-foreground"
      : "text-foreground"
  );

  // Full string values remain accessible through the
  // native tooltip when truncated.
  const fullValue =
    typeof value === "string" ? value : undefined;

  return (
    <div className="flex items-baseline gap-2.5 py-2">
      {/* Provenance indicator */}
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 h-3.5 w-0.5 shrink-0 self-start rounded-full",
          marker,
          provenance === "empty" && "rounded-none"
        )}
      />

      {/* Field label */}
      <span className="shrink-0 text-xs text-muted-foreground">
        {label}
      </span>

      {/* Field value */}
      <span className="ml-auto min-w-0 text-right">
        {onActivate ? (
          <button
            type="button"
            onClick={onActivate}
            title={fullValue}
            className={cn(
              "block max-w-full truncate text-right text-xs",
              "font-semibold text-primary",
              "transition-colors hover:underline",
              "focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              "focus-visible:ring-offset-1",
              mono && "font-mono"
            )}
          >
            {value}
          </button>
        ) : (
          <span
            className={valueClass}
            title={fullValue}
          >
            {value}
          </span>
        )}
      </span>

      {trailing}
    </div>
  );
}

/**
 * Small uppercase section heading within the
 * agent specification sheet.
 */
export function SpecGroup({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <section className="mb-5">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>

      <div className="divide-y divide-border">
        {children}
      </div>
    </section>
  );
}
