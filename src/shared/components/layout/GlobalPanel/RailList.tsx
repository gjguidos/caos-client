
"use client";

import { Loader2 } from "lucide-react";

import { SidebarRow } from "@/shared/components/layout/AppShell/SidebarRow";

interface RailListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;

  loading?: boolean;
  activeKey?: string | null;

  /** Shown when the section contains no items. */
  emptyLabel: string;

  /** Receives the original item, preserving its type. */
  onSelect: (item: T) => void;
}

/**
 * Generic list of sidebar navigation items.
 *
 * Supports:
 * - Loading indicator
 * - Empty state
 * - Active item highlighting
 * - Item selection
 *
 * Navigation appearance is delegated to SidebarRow.
 */
export function RailList<T>({
  items,
  getKey,
  getLabel,
  loading = false,
  activeKey,
  emptyLabel,
  onSelect,
}: Readonly<RailListProps<T>>) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-4"
        role="status"
        aria-label="Loading items"
      >
        <Loader2
          className="size-5 animate-spin text-muted-foreground"
          aria-hidden="true"
        />

        <span className="sr-only">Loading items…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-2 pl-6">
        <p className="text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const key = getKey(item);

        return (
          <SidebarRow
            key={key}
            label={getLabel(item)}
            isActive={key === activeKey}
            onClick={() => onSelect(item)}
          />
        );
      })}
    </div>
  );
}
