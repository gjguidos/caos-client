
"use client";

import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

import type { Gap } from "../draftStatus";

/**
 * The wizard's centralized submit rule.
 *
 * Used in two places:
 * - Full-width in the specification sheet
 * - Inline in the step footer on smaller screens
 *
 * Both share the same validation and disabled behavior.
 */
export function SubmitButton({
  gaps,
  onSubmit,
  label,
  submitting = false,
  busyReason,
  fluid = false,
}: Readonly<{
  gaps: Gap[];
  onSubmit: () => void;
  label: string;
  submitting?: boolean;
  /** Why submit is unavailable while nothing is missing. */
  busyReason?: string;
  fluid?: boolean;
}>) {
  const blocked = gaps.length > 0;

  const title = blocked
    ? `${gaps.length} ${
        gaps.length === 1 ? "field" : "fields"
      } still needed`
    : busyReason;

  return (
    <Button
      type="button"
      variant="default"
      onClick={onSubmit}
      disabled={submitting || blocked}
      aria-busy={submitting}
      title={title}
      className={cn(fluid && "w-full")}
    >
      {submitting && (
        <Loader2
          className="size-4 animate-spin"
          aria-hidden="true"
        />
      )}

      {label}

      {!fluid && !submitting && (
        <Check
          className="size-4"
          aria-hidden="true"
        />
      )}
    </Button>
  );
}

/**
 * Navigation shortcut to the first missing field.
 *
 * Displayed when the specification sheet's gap list
 * is unavailable at smaller viewport widths.
 */
export function GapShortcutButton({
  gapCount,
  onClick,
}: Readonly<{
  gapCount: number;
  onClick: () => void;
}>) {
  if (gapCount === 0) {
    return null;
  }

  const plural = gapCount === 1;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={`Go to the first of ${gapCount} missing ${
        plural ? "field" : "fields"
      }`}
    >
      {gapCount} {plural ? "thing" : "things"} left
    </Button>
  );
}
