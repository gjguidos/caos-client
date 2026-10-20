
export interface Definition {
  label: string;
  value: string;
}

interface DefinitionListProps {
  items: Definition[];
}

/**
 * A label/value list shared by the Identity
 * and Cognitive modules sections.
 *
 * Uses a consistent two-column layout so labels
 * and values align across every row.
 */
export function DefinitionList({
  items,
}: Readonly<DefinitionListProps>) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-sm text-muted-foreground">
            {item.label}
          </dt>

          <dd className="min-w-0 break-words text-sm text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
