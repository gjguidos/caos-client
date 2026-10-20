"use client";

import { useCallback, useId, useRef } from "react";

export interface PanelTabsProps<T extends string> {
  tabs: ReadonlyArray<{ id: T; label: string; count?: number }>;
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}

/**
 * Underlined tab strip for the side panel. Kept local rather than reusing the
 * admin shadcn `Tabs`, which is a pill-on-`bg-muted` treatment from the other
 * design system and reads as a control rather than a section divider.
 *
 * Labels take Skapa's `Label.M` through the typography class rather than the
 * `Text` component, which would have to wrap the `role="tab"` button. Both
 * states share the one ramp entry: selection reads from colour and the
 * underline, so switching tabs cannot resize the labels under the pointer.
 */
export function PanelTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: Readonly<PanelTabsProps<T>>) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  // Roving arrow-key navigation, per the tabs pattern.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const delta =
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      const index = tabs.findIndex((tab) => tab.id === active);
      const next = tabs[(index + delta + tabs.length) % tabs.length];
      onChange(next.id);
      listRef.current
        ?.querySelector<HTMLButtonElement>(
          `#${CSS.escape(`${baseId}-${next.id}`)}`
        )
        ?.focus();
    },
    [active, tabs, onChange, baseId]
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="flex shrink-0 gap-100 border-b border-neutral-3 px-100"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`${baseId}-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`typography-label-m -mb-px border-b-2 py-50 transition-colors duration-standard-web ease-easy ${
              isActive
                ? "border-b-text-1 text-text-1"
                : "border-b-transparent text-text-3 hover:text-text-1"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-25 font-normal text-text-3">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
