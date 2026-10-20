
import { cn } from "@/shared/lib/utils";

export interface Chip {
  key: string;
  label: string;

  /**
   * Optional trailing note for unresolved registry keys.
   * When present, the label uses monospace typography.
   */
  note?: string;
}

interface ChipListProps {
  items: Chip[];
}

/**
 * Read-only chip list shared by the agent's
 * Tools and Workflows detail sections.
 *
 * Chips are deliberately non-interactive:
 * no buttons, click handlers, or unnecessary tab stops.
 */
export function ChipList({
  items,
}: Readonly<ChipListProps>) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5",
            "rounded-md border border-border",
            "bg-muted/40 px-2 py-1",
            "text-sm text-foreground"
          )}
        >
          <span
            className={cn(
              "min-w-0 break-words",
              item.note && "font-mono text-xs"
            )}
          >
            {item.label}
          </span>

          {item.note && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.note}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
