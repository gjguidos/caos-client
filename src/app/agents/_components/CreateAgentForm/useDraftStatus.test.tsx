import { AgentFormValues } from "@/shared/lib/agent.types";
import { act, renderHook } from "@/test-utils/test-utils";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { agentFormDefaults } from "./agentForm";
import type { Gap } from "./draftStatus";
import { MenuSection } from "./sections/wizardSteps";
import { useDraftStatus } from "./useDraftStatus";

const cognitiveModules = {
  llm: { default: "azure-gpt-4o", options: ["azure-gpt-4o"] },
};

function gapFor(gaps: Gap[], field: string): Gap {
  const gap = gaps.find((g) => g.field === field);
  if (!gap) throw new Error(`Expected a gap for "${field}"`);
  return gap;
}

function useHarness(
  defaults: Partial<AgentFormValues>,
  onSelect: (step: MenuSection) => void
) {
  const form = useForm<AgentFormValues>({
    defaultValues: { ...agentFormDefaults, ...defaults },
  });
  const status = useDraftStatus(
    form,
    cognitiveModules,
    MenuSection.Identity,
    onSelect
  );
  return { form, ...status };
}

describe("useDraftStatus", () => {
  it("has no active gap until one is followed", () => {
    const { result } = renderHook(() => useHarness({ name: "" }, vi.fn()));

    expect(result.current.gaps.length).toBeGreaterThan(0);
    expect(result.current.activeGap).toBeNull();
  });

  it("takes the reader to the gap's step and makes it active", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useHarness({ name: "" }, onSelect));
    const gap = gapFor(result.current.gaps, "name");

    act(() => result.current.goToGap(gap));

    expect(onSelect).toHaveBeenCalledWith(MenuSection.Identity);
    expect(result.current.activeGap).toMatchObject({ field: "name" });
  });

  it("gives each visit its own identity, so a repeat visit is not the first", () => {
    const { result } = renderHook(() => useHarness({ name: "" }, vi.fn()));
    const gap = gapFor(result.current.gaps, "name");

    act(() => result.current.goToGap(gap));
    const first = result.current.activeGap;

    act(() => result.current.goToGap(gap));

    expect(result.current.activeGap).not.toBe(first);
    expect(result.current.activeGap).toMatchObject({ field: "name" });
  });

  it("retires the active gap once its field is filled, touching nothing else", () => {
    const { result } = renderHook(() => useHarness({ name: "" }, vi.fn()));
    const gap = gapFor(result.current.gaps, "name");

    act(() => result.current.goToGap(gap));
    expect(result.current.activeGap).not.toBeNull();

    act(() => result.current.form.setValue("name", "Nova Research"));

    expect(result.current.activeGap).toBeNull();
    expect(result.current.gaps.some((g) => g.field === "name")).toBe(false);
    // Clearing is a consequence of the gap closing, not a write we have to undo.
    expect(result.current.form.formState.errors.name).toBeUndefined();
  });
});
