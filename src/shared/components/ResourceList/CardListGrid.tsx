"use client";

import type { ResourceListError as ResourceListErrorState } from "@/shared/lib/resourceListError";
import { Fragment, type ReactNode } from "react";
import { EmptyResourceState } from "./EmptyResourceState";
import { ResourceListError } from "./ResourceListError";

const GRID_CLASSES =
  "grid grid-flow-row auto-rows-[18rem] grid-cols-[repeat(auto-fill,12rem)] sm:grid-cols-[repeat(auto-fill,15rem)] justify-start gap-x-skapa-sm m:gap-x-skapa-md l:gap-x-skapa-lg gap-y-200";

interface CardListGridProps<T> {
  items: T[];
  loading: boolean;
  error: ResourceListErrorState | null;
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onRetry?: () => void;
  resource: string;
  emptyStateConfig?: {
    title: string;
    description: string;
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function CardListGrid<T>({
  items,
  loading,
  error,
  getKey,
  renderCard,
  onRetry,
  resource,
  emptyStateConfig,
}: CardListGridProps<T>) {
  if (loading) return null;

  if (error) {
    return (
      <div className="w-full self-stretch">
        <ResourceListError
          message={error.message}
          type={error.type ?? undefined}
          onRetry={onRetry}
          resource={resource}
        />
      </div>
    );
  }

  if (items.length === 0) {
    const effectiveConfig = {
      title: emptyStateConfig?.title || `No ${capitalize(resource)}s Available`,
      description:
        emptyStateConfig?.description ||
        `There are currently no ${resource}s to display.`,
    };

    return (
      <div className="w-full self-stretch">
        <div className="my-400">
          <EmptyResourceState {...effectiveConfig} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full self-stretch pb-200">
      <div className={GRID_CLASSES} aria-label={`${capitalize(resource)} list`}>
        {items.map((item) => (
          <Fragment key={getKey(item)}>{renderCard(item)}</Fragment>
        ))}
      </div>
    </div>
  );
}
