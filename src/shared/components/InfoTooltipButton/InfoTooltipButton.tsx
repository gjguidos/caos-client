
"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/shared/lib/utils";

interface InfoTooltipButtonProps {
  /**
   * Accessible name of the button, e.g. "Visibility info".
   * The explanation is provided by the tooltip.
   */
  label: string;

  /** Explanation displayed in the tooltip. */
  description: string;

  className?: string;
}

/**
 * Information tooltip for form fields and settings.
 *
 * Distinct from IconActionButton:
 * - Does not execute an action
 * - Provides contextual explanation
 * - Supports hover and keyboard focus
 * - Keeps the button accessible by name
 */
export function InfoTooltipButton({
  label,
  description,
  className,
}: Readonly<InfoTooltipButtonProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Info
            className="size-4"
            aria-hidden="true"
          />
        </Button>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        className={cn("max-w-80", className)}
      >
        <p className="text-xs leading-relaxed">
          {description}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
