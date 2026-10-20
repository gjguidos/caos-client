
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

interface StatusLineProps {
  /**
   * Paints the dot: a `bg-*` fill for a reached state,
   * or a `border` for a state that is merely absent.
   */
  dotClassName: string;

  /** Color and optional truncation for the caption. */
  textClassName?: string;

  /** Pulse the dot to signal an operation in progress. */
  pulse?: boolean;

  /** Short, single-line status caption. */
  children: ReactNode;
}

/**
 * Shared visual representation of a status:
 * a decorative dot followed by a short caption.
 *
 * Each caller supplies its own status colors.
 * The dot is hidden from assistive technology,
 * leaving the caption as the accessible content.
 */
export function StatusLine({
  dotClassName,
  textClassName,
  pulse = false,
  children,
}: Readonly<StatusLineProps>) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          dotClassName,
          pulse && "animate-pulse motion-reduce:animate-none"
        )}
        aria-hidden="true"
      />

      <span
        className={cn(
          "min-w-0 truncate text-xs font-medium text-muted-foreground",
          textClassName
        )}
      >
        {children}
      </span>
    </span>
  );
}
