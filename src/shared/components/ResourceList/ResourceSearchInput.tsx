
"use client";

import { Input } from "@/shared/components/Input/Input";
import { Loader2, Search } from "lucide-react";

interface ResourceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  count: number;
  resultCount?: number;
  loading?: boolean;
  searchQuery?: string;
  resourceLabel?: string;
}

export function ResourceSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  count,
  resultCount,
  loading = false,
  searchQuery,
  resourceLabel = "resource",
}: ResourceSearchInputProps) {
  const rawQuery = searchQuery?.trim() ?? "";
  const MAX_QUERY_LENGTH = 30;

  const displayQuery =
    rawQuery.length > MAX_QUERY_LENGTH
      ? `${rawQuery.slice(0, MAX_QUERY_LENGTH)}...`
      : rawQuery;

  const hasResultsQuery =
    rawQuery.length > 0 &&
    typeof resultCount === "number";

  const resultLabel = hasResultsQuery
    ? `${resultCount} ${resultCount === 1 ? "result" : "results"} for`
    : `${count} ${
        count === 1 ? resourceLabel : `${resourceLabel}s`
      }`;

  return (
    <>
      <div className="relative w-full min-w-0 max-w-[900px]">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />

        <Input
          id={`${resourceLabel}-search`}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9"
        />
      </div>

      <div
        className="ml-2 mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <Loader2
            aria-label="Loading resources"
            role="status"
            className="size-4 animate-spin"
          />
        ) : (
          <span
            className="shrink-0 overflow-hidden"
            title={rawQuery}
          >
            {resultLabel}
          </span>
        )}

        {hasResultsQuery && (
          <span
            className="min-w-0 truncate text-foreground"
            title={rawQuery}
          >
            &quot;{displayQuery}&quot;
          </span>
        )}
      </div>
    </>
  );
}
