"use client";

import type { ResourceListState } from "@/shared/hooks/useResourceList";
import type { ReactNode } from "react";
import { PageHeader } from "@/shared/components/PageHeader/PageHeader";
import { CardListGrid } from "./CardListGrid";
import { ResourceSearchInput } from "./ResourceSearchInput";

interface ResourceEmptyCopy {
  defaultTitle: string;
  defaultDescription: string;
  searchTitle: string;
  searchDescription: string;
}

interface ResourceBrowserProps<T> {
  /** Section name shown above the title. Omit when it would repeat the title. */
  eyebrow?: string;
  title: string;
  resource: string;
  resourceLabel?: string;
  searchPlaceholder: string;
  list: ResourceListState<T>;
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  action?: ReactNode;
  emptyCopy: ResourceEmptyCopy;
}

export function ResourceBrowser<T>({
  eyebrow,
  title,
  resource,
  resourceLabel = resource,
  searchPlaceholder,
  list,
  getKey,
  renderCard,
  action,
  emptyCopy,
}: ResourceBrowserProps<T>) {
  const isSearching = list.searchQuery.trim().length > 0;

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        actions={action}
        search={
          <ResourceSearchInput
            value={list.searchQuery}
            onChange={list.setSearchQuery}
            placeholder={searchPlaceholder}
            count={list.items.length}
            resultCount={list.filteredItems.length}
            loading={list.loading}
            searchQuery={list.searchQuery}
            resourceLabel={resourceLabel}
          />
        }
      />
      <CardListGrid
        items={list.filteredItems}
        loading={list.loading}
        error={list.error}
        onRetry={list.refresh}
        resource={resource}
        getKey={getKey}
        renderCard={renderCard}
        emptyStateConfig={{
          title: isSearching ? emptyCopy.searchTitle : emptyCopy.defaultTitle,
          description: isSearching
            ? emptyCopy.searchDescription
            : emptyCopy.defaultDescription,
        }}
      />
    </div>
  );
}
