
"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/shared/components/IconActionButton/IconActionButton";
import { cn } from "@/shared/lib/utils";

export const RESOURCE_CARD_CONTAINER_STYLES =
  "group relative h-[18rem] w-full max-w-[15rem]";

const RESOURCE_CARD_SURFACE_STYLES =
  "block h-full w-full rounded-lg bg-muted/50 p-6 transition-all duration-150 ease-in-out";

/**
 * The link owns hover and keyboard-focus styling.
 *
 * A transparent resting border prevents layout shifts
 * when the card is hovered or focused.
 */
const RESOURCE_CARD_LINK_STYLES = cn(
  RESOURCE_CARD_SURFACE_STYLES,
  "group/link border border-transparent",
  "hover:border-border hover:shadow-md",
  "focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
  "active:scale-[0.98]"
);

const RESOURCE_CARD_OPEN_ROW_STYLES =
  "flex items-center gap-2 border-t border-border pt-3 text-foreground";

const RESOURCE_CARD_OPEN_LABEL_STYLES =
  "group-hover/link:underline group-focus-visible/link:underline";

const RESOURCE_CARD_OPEN_ARROW_STYLES = cn(
  "transition-transform duration-150 ease-in-out",
  "motion-safe:group-hover/link:translate-x-1",
  "motion-safe:group-focus-visible/link:translate-x-1"
);

interface ResourceCardProps {
  label: string;
  href?: string;
  children: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;

  /** Label for the destination, e.g. "Open chat". */
  openLabel?: string;

  deleteConfig?: {
    label: string;
    confirmationText: string;
    onDelete: () => Promise<unknown>;
    disabled?: boolean;
  };
}

/**
 * Shared resource card.
 *
 * Supports:
 * - Primary navigation link
 * - Secondary actions
 * - Optional badge
 * - Two-step deletion confirmation
 *
 * Secondary actions sit outside the navigation link,
 * avoiding nested interactive elements.
 */
export function ResourceCard({
  label,
  href,
  children,
  actions,
  badge,
  openLabel = "Open",
  deleteConfig,
}: Readonly<ResourceCardProps>) {
  const [isConfirmingDelete, setIsConfirmingDelete] =
    useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAttempt = async (
    event: MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!deleteConfig || deleteConfig.disabled || isDeleting) {
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setIsDeleting(true);

    try {
      await deleteConfig.onDelete();
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActions =
    Boolean(actions || deleteConfig);

  const body = (
    <div
      className={cn(
        "flex h-full flex-col justify-between",
        hasActions && "pt-4"
      )}
    >
      {children}

      {href && (
        <div className={RESOURCE_CARD_OPEN_ROW_STYLES}>
          <span
            className={cn(
              "text-sm font-medium",
              RESOURCE_CARD_OPEN_LABEL_STYLES
            )}
          >
            {openLabel}
          </span>

          <ArrowRight
            className={cn(
              "size-3.5",
              RESOURCE_CARD_OPEN_ARROW_STYLES
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );

  return (
    <article
      className={RESOURCE_CARD_CONTAINER_STYLES}
      aria-label={label}
    >
      {/* Main resource surface */}
      {href ? (
        <Link
          href={href}
          className={RESOURCE_CARD_LINK_STYLES}
        >
          {body}
        </Link>
      ) : (
        <div className={RESOURCE_CARD_SURFACE_STYLES}>
          {body}
        </div>
      )}

      {badge}

      {/* Secondary card actions */}
      {(actions || deleteConfig) && (
        <div
          className={cn(
            "absolute right-2 top-2 z-10 flex gap-2",
            "opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100",
            "group-focus-within:opacity-100"
          )}
        >
          {actions}

          {deleteConfig && (
            <IconActionButton
              icon={Trash2}
              label={deleteConfig.label}
              onClick={handleDeleteAttempt}
              disabled={
                deleteConfig.disabled || isDeleting
              }
            />
          )}
        </div>
      )}

      {/* Inline delete confirmation */}
      {isConfirmingDelete && deleteConfig && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/30 p-3">
          <div
            role="alertdialog"
            aria-label={deleteConfig.confirmationText}
            aria-modal="true"
            className="w-full max-w-[12.5rem] rounded-lg border border-border bg-popover p-4 text-center text-popover-foreground shadow-lg"
          >
            <p className="text-sm">
              {deleteConfig.confirmationText}
            </p>

            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setIsConfirmingDelete(false)
                }
                disabled={isDeleting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(event) => {
                  void handleDeleteAttempt(event);
                }}
                disabled={
                  deleteConfig.disabled || isDeleting
                }
              >
                {isDeleting
                  ? "Deleting…"
                  : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
