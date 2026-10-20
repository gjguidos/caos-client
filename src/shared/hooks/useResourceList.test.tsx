import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResourceList } from "./useResourceList";

interface Item {
  id: string;
  name: string;
}

const options = (
  fetchItems: () => Promise<Item[]>,
  deleteItem: (key: string) => Promise<void>
) => ({
  fetchItems,
  deleteItem,
  getKey: (item: Item) => item.id,
  matchesSearch: (item: Item, query: string) =>
    item.name.toLowerCase().includes(query),
});

describe("useResourceList", () => {
  let items: Item[];
  let fetchItems: () => Promise<Item[]>;
  let deleteItem: (key: string) => Promise<void>;

  beforeEach(() => {
    items = [
      { id: "a1", name: "Planner" },
      { id: "a2", name: "Researcher" },
    ];
    fetchItems = vi.fn(async () => [...items]);
    deleteItem = vi.fn(async (key: string) => {
      items = items.filter((item) => item.id !== key);
    });
  });

  it("drops the deleted item from its own list", async () => {
    const { result } = renderHook(() =>
      useResourceList(options(fetchItems, deleteItem))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDelete("a1");
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["a2"]);
  });

  it("restores the item when the delete fails", async () => {
    const failingDelete = vi.fn(async () => {
      throw new Error("nope");
    });
    const { result } = renderHook(() =>
      useResourceList(options(fetchItems, failingDelete))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome!: { ok: boolean };
    await act(async () => {
      outcome = await result.current.handleDelete("a1");
    });

    expect(outcome.ok).toBe(false);
    expect(result.current.items).toHaveLength(2);
  });
});
