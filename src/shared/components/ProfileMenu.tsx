
"use client";

import { UserRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { sidebarSurfaceClass } from "@/shared/components/layout/AppShell/SidebarRow";
import { cn } from "@/shared/lib/utils";

interface ProfileMenuProps {
  name?: string;
  username?: string;
}

function removeParentheses(value?: string): string {
  if (!value) return "";

  return value
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function getFirstTwoInitials(value?: string): string {
  if (!value) return "U";

  const words = value.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (
    words[0].charAt(0) +
    words[1].charAt(0)
  ).toUpperCase();
}

/**
 * Profile menu for the local CAOS application.
 *
 * Displays the current user's identity without
 * depending on the removed authentication flow.
 *
 * DropdownMenu provides:
 * - Outside-click dismissal
 * - Escape-key dismissal
 * - Keyboard navigation
 * - Focus management
 */
export default function ProfileMenu({
  name,
  username,
}: Readonly<ProfileMenuProps>) {
  const rawDisplayName =
    name ?? username ?? "User";

  const displayName =
    removeParentheses(rawDisplayName) || "User";

  const initials =
    getFirstTwoInitials(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            sidebarSurfaceClass("gap-4"),
            "w-full text-left",
            "focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-2"
          )}
          aria-label={`Open profile menu for ${displayName}`}
        >
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold text-foreground"
              title={displayName}
            >
              {displayName}
            </p>

            {username && (
              <p
                className="truncate text-xs font-normal text-muted-foreground"
                title={username}
              >
                {username}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
          <UserRound
            className="size-3.5"
            aria-hidden="true"
          />
          Local session
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
