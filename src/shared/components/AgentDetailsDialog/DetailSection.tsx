
import type { ReactNode } from "react";

interface DetailSectionProps {
  title: string;

  /**
   * The items this section will render.
   * Used for both the count and empty-state handling.
   */
  items: readonly unknown[];

  /** Displayed instead of children when no items exist. */
  empty: string;

  /** Display the number of items after the heading. */
  showCount?: boolean;

  children: ReactNode;
}

/**
 * Shared section layout for the agent details dialog.
 *
 * All sections use the same heading level, spacing,
 * and empty-state treatment to create a consistent
 * specification-style presentation.
 */
export function DetailSection({
  title,
  items,
  empty,
  showCount = false,
  children,
}: Readonly<DetailSectionProps>) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}

        {showCount && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({items.length})
          </span>
        )}
      </h3>

      {items.length > 0 ? (
        children
      ) : (
        <p className="text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}
