import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRunInputs } from "./useRunInputs";

function renderRunInputs(initialKey: string | null = "brief_writer") {
  return renderHook((key: string | null) => useRunInputs(key), {
    initialProps: initialKey,
  });
}

describe("useRunInputs", () => {
  it("starts empty", () => {
    const { result } = renderRunInputs();
    expect(result.current.values).toEqual({});
  });

  it("accumulates values across fields", () => {
    const { result } = renderRunInputs();

    act(() => result.current.setValue("topic", "Q3 launch"));
    act(() => result.current.setValue("threshold", 0.2));

    expect(result.current.values).toEqual({
      topic: "Q3 launch",
      threshold: 0.2,
    });
  });

  it("keeps a half-filled form across re-renders of the same workflow", () => {
    const { result, rerender } = renderRunInputs();

    act(() => result.current.setValue("topic", "Q3 launch"));
    rerender("brief_writer");

    expect(result.current.values).toEqual({ topic: "Q3 launch" });
  });

  it("drops the values when the workflow changes", () => {
    const { result, rerender } = renderRunInputs();

    act(() => result.current.setValue("topic", "Q3 launch"));
    rerender("image_pipeline");

    expect(result.current.values).toEqual({});
  });

  it("keeps values typed before the workflow key first resolves", () => {
    const { result, rerender } = renderRunInputs(null);

    act(() => result.current.setValue("topic", "Q3 launch"));
    rerender("brief_writer");

    expect(result.current.values).toEqual({ topic: "Q3 launch" });
  });
});
