"use client";

import type {
  ResourceDeleteResult,
  ResourceListError,
} from "@/shared/lib/resourceListError";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseResourceListOptions<T> {
  fetchItems: () => Promise<T[]>;
  getKey: (item: T) => string;
  matchesSearch: (item: T, query: string) => boolean;
  deleteItem?: (key: string) => Promise<ResourceDeleteResult | void>;
}

export interface ResourceListState<T> {
  items: T[];
  filteredItems: T[];
  loading: boolean;
  error: ResourceListError | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleDelete: (key: string) => Promise<ResourceDeleteResult>;
  refresh: () => Promise<void>;
}

const success: ResourceDeleteResult = { ok: true };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useResourceList<T>({
  fetchItems,
  getKey,
  matchesSearch,
  deleteItem,
}: UseResourceListOptions<T>): ResourceListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ResourceListError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await fetchItems());
    } catch (e) {
      setError({ type: "fetch", message: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => matchesSearch(item, query));
  }, [items, matchesSearch, searchQuery]);

  const handleDelete = async (key: string): Promise<ResourceDeleteResult> => {
    if (!deleteItem) {
      return {
        ok: false,
        errorCode: null,
        message: "Delete is not available.",
      };
    }

    const originalItems = items;
    setItems((prev) => prev.filter((item) => getKey(item) !== key));

    try {
      const result = (await deleteItem(key)) ?? success;
      if (!result.ok) {
        setItems(originalItems);
        return result;
      }

      await loadItems();
      return success;
    } catch (e) {
      setItems(originalItems);
      return { ok: false, errorCode: null, message: errorMessage(e) };
    }
  };

  return {
    items,
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    handleDelete,
    refresh: loadItems,
  };
}
