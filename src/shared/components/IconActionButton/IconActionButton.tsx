
"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IconActionButtonBaseProps = {
  /** Lucide icon component, e.g. Pencil or Info. */
  icon: LucideIcon;

  /**
   * Accessible action name, also displayed in the tooltip.
   */
  label: string;

  size?: "xsmall" | "small";

  /** Visual treatment of the button. */
  variant?: "ghost" | "outline" | "secondary";
};

/**
 * A compact icon-only action.
 *
 * Action buttons remain focusable when disabled
 * so the tooltip can still explain the action.
 */
export type IconActionButtonProps =
  IconActionButtonBaseProps &
    (
      | {
          onClick: (
            event: MouseEvent<HTMLButtonElement>
          ) => void;
          disabled?: boolean;
          href?: never;
        }
      | {
          href: string;
          onClick?: never;
          disabled?: never;
        }
    );

export function IconActionButton({
  icon: Icon,
  label,
  size = "xsmall",
  variant = "ghost",
  ...action
}: IconActionButtonProps) {
  const buttonSize =
    size === "xsmall" ? "size-8" : "size-9";

  const handleClick = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    if (action.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    action.onClick?.(event);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {action.href !== undefined ? (
          <Button
            asChild
            variant={variant}
            size="icon"
            className={buttonSize}
          >
            <Link
              href={action.href}
              aria-label={label}
            >
              <Icon
                className="size-4"
                aria-hidden="true"
              />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant={variant}
            size="icon"
            className={buttonSize}
            aria-label={label}
            aria-disabled={action.disabled || undefined}
            onClick={handleClick}
          >
            <Icon
              className="size-4"
              aria-hidden="true"
            />
          </Button>
        )}
      </TooltipTrigger>

      <TooltipContent>
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
