
"use client";

import { useCallback } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useClipboard } from "@/shared/hooks/useClipboard";
import { formatForClipboard } from "@/shared/lib/clipboardValue";
import { cn } from "@/shared/lib/utils";

export interface CopyButtonProps {
  /** Any displayed value; formatForClipboard determines its text form. */
  value: unknown;

  /** Description of what is copied, e.g. "Copy output". */
  label: string;

  className?: string;
}

/**
 * Copies a displayed value to the clipboard.
 *
 * Uses the shared clipboard hook for state and
 * the shared formatter for serializing values.
 *
 * Provides visual and accessible confirmation
 * after a successful copy.
 */
export function CopyButton({
  value,
  label,
  className,
}: Readonly<CopyButtonProps>) {
  const { copy, copied } = useClipboard();

  const handleCopy = useCallback(() => {
    void copy(formatForClipboard(value));
  }, [copy, value]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={copied ? "Copied!" : `Copy ${label}`}
      title={copied ? "Copied!" : `Copy ${label}`}
      onClick={handleCopy}
      className={cn(
        "size-8 shrink-0",
        copied && "text-emerald-600 dark:text-emerald-400",
        className
      )}
    >
      {copied ? (
        <Check
          className="size-4"
          aria-hidden="true"
        />
      ) : (
        <Copy
          className="size-4"
          aria-hidden="true"
        />
      )}
    </Button>
  );
}
