
"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/lib/utils";

import { useToolRegistry } from "@/store/selectors";

import {
  CONTROL_STEP_KINDS,
  encodePaletteKind,
  paletteKindKey,
  PALETTE_DND_TYPE,
  type PaletteKind,
} from "../_lib/stepKinds";

interface BuilderPaletteProps {
  /** Click-to-add fallback: adds the kind at the viewport center. */
  onAdd: (kind: PaletteKind) => void;
}

/** Case-insensitive substring matching for palette entries. */
function matches(label: string, query: string): boolean {
  return label
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

/**
 * Left-hand palette for the editable workflow canvas.
 *
 * Combines:
 * - Tool nodes from the Redux registry
 * - Built-in control step types
 *
 * Every item supports drag-and-drop and click-to-add.
 */
export function BuilderPalette({
  onAdd,
}: Readonly<BuilderPaletteProps>) {
  const tools = useToolRegistry();
  const [search, setSearch] = useState("");

  const toolKinds = useMemo(
    () =>
      tools
        .map(
          (tool): PaletteKind => ({
            stepType: "tool",
            toolName: tool.key,
            label: tool.name,
          })
        )
        .filter((kind) => matches(kind.label, search)),
    [tools, search]
  );

  const controlKinds = useMemo(
    () =>
      CONTROL_STEP_KINDS.map(
        (entry): PaletteKind => ({
          stepType: entry.type,
          label: entry.label,
        })
      ).filter((kind) => matches(kind.label, search)),
    [search]
  );

  const noMatches =
    search.trim() !== "" &&
    toolKinds.length === 0 &&
    controlKinds.length === 0;

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 overflow-hidden border-r border-border bg-card p-3">
      {/* Search stays pinned while palette sections scroll. */}
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          id="palette-search"
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          onKeyDown={(event) => {
            // Filtering is live; there is nothing to submit.
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder="Search steps"
          aria-label="Search steps"
          className="h-9 pl-9 pr-8"
        />

        {search && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            title="Clear search"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
          >
            <X
              className="size-3.5"
              aria-hidden="true"
            />
          </Button>
        )}
      </div>

      {/* Only palette sections scroll. */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <PaletteSection
          title="Tools"
          count={toolKinds.length}
        >
          {tools.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tools available.
            </p>
          ) : (
            toolKinds.map((kind) => (
              <PaletteItem
                key={paletteKindKey(kind)}
                kind={kind}
                label={kind.label}
                onAdd={onAdd}
              />
            ))
          )}
        </PaletteSection>

        <PaletteSection
          title="Controls"
          count={controlKinds.length}
        >
          {controlKinds.map((kind) => (
            <PaletteItem
              key={paletteKindKey(kind)}
              kind={kind}
              label={kind.label}
              tone="control"
              onAdd={onAdd}
            />
          ))}
        </PaletteSection>

        {noMatches && (
          <p
            className="text-xs text-muted-foreground"
            role="status"
          >
            No steps match &ldquo;{search.trim()}&rdquo;.
          </p>
        )}
      </div>
    </aside>
  );
}

function PaletteSection({
  title,
  count,
  children,
}: Readonly<{
  title: string;
  count?: number;
  children: ReactNode;
}>) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {count !== undefined && ` (${count})`}
      </h2>

      <div className="flex flex-col gap-1">
        {children}
      </div>
    </section>
  );
}

/**
 * Controls have a slightly different background and border
 * so they're distinguishable from concrete tool nodes.
 */
const TONE_CLASSES = {
  tool: "border-border bg-background",
  control: "border-border bg-muted/60",
} as const;

function PaletteItem({
  kind,
  label,
  tone = "tool",
  onAdd,
}: Readonly<{
  kind: PaletteKind;
  label: string;
  tone?: keyof typeof TONE_CLASSES;
  onAdd: (kind: PaletteKind) => void;
}>) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(
          PALETTE_DND_TYPE,
          encodePaletteKind(kind)
        );

        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onAdd(kind)}
      title={`Add ${label}`}
      className={cn(
        "cursor-grab truncate rounded-md border px-2 py-1.5 text-left text-sm text-foreground shadow-sm",
        "transition-colors hover:border-primary/60 hover:bg-accent",
        "active:cursor-grabbing",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "focus-visible:ring-offset-1",
        TONE_CLASSES[tone]
      )}
    >
      <span className="block truncate">
        {label}
      </span>
    </button>
  );
}
