
"use client";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import type { ClassValue } from "clsx";

import { cn } from "@/shared/lib/utils";

/**
 * Shared geometry and keyboard focus treatment
 * for every clickable surface in the sidebar.
 */
const SIDEBAR_SURFACE = cn(
  "flex w-full items-center gap-2",
  "rounded-md px-4 py-2 text-left",
  "transition-colors duration-150 ease-in-out",
  "focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-ring",
  "focus-visible:ring-offset-1"
);

/** Hover and pressed states for inactive rows. */
const SIDEBAR_FILL =
  "hover:bg-accent active:bg-accent/80";

/**
 * Active-page indicator.
 *
 * Uses a pseudo-element to render a vertical primary
 * marker along the leading edge of the selected row.
 */
const SIDEBAR_ACTIVE = cn(
  "bg-primary/5 hover:bg-primary/10",
  "before:absolute before:inset-y-2",
  "before:left-0 before:w-[3px]",
  "before:rounded-full before:bg-primary",
  "before:content-['']"
);

/**
 * Shared clickable surface for sidebar elements
 * that provide their own content, such as the
 * application logo and profile menu.
 */
export function sidebarSurfaceClass(
  ...extra: ClassValue[]
) {
  return cn(
    SIDEBAR_SURFACE,
    SIDEBAR_FILL,
    ...extra
  );
}

interface SidebarRowBase {
  label: string;

  /** Lucide icon component, e.g. Bot, Workflow, Settings. */
  icon?: LucideIcon;

  isActive?: boolean;

  /**
   * Section rows represent a navigation category.
   * Item rows represent entries within that category.
   */
  variant?: "section" | "item";
}

/** A row either navigates or executes an action. */
type SidebarRowAction =
  | {
      href: string;
      onClick?: never;
    }
  | {
      onClick: () => void;
      href?: never;
    };

type SidebarRowProps = Readonly<
  SidebarRowBase & SidebarRowAction
>;

/**
 * One navigation row in the application sidebar.
 *
 * Supports:
 * - Section and item variants
 * - Active page indicators
 * - Navigation links
 * - Click actions
 * - Optional Lucide icons
 *
 * The active destination uses aria-current="page".
 */
export function SidebarRow({
  label,
  icon: Icon,
  isActive = false,
  variant = "item",
  href,
  onClick,
}: SidebarRowProps) {
  const shared = {
    className: cn(
      SIDEBAR_SURFACE,
      "group relative",
      variant === "item" && "pl-6",
      isActive
        ? SIDEBAR_ACTIVE
        : SIDEBAR_FILL
    ),
    title: label,
    "aria-current": isActive
      ? ("page" as const)
      : undefined,
  };

  const content = (
    <>
      {Icon && (
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}

      {variant === "section" ? (
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
          {label}
        </span>
      ) : (
        <span
          className={cn(
            "min-w-0 truncate text-sm",
            isActive
              ? "font-semibold text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {label}
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href}
        {...shared}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      {...shared}
    >
      {content}
    </button>
  );
}
