import { act, renderHook } from "@/test-utils/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useToolFormSync } from "./useToolFormSync";
import {
  clearToolForm,
  initToolForm,
  updateIsThinking,
} from "@/store/slices/toolForm/toolFormSlice";
import type { AppDispatch } from "@/store";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";

vi.mock("@/store/hooks", () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

import { useAppDispatch, useAppSelector } from "@/store/hooks";

function makeComponent(
  id: string,
  flag: string,
  required = false,
  overrides: Partial<UIComponent> = {}
): UIComponent {
  return {
    id,
    type: "text",
    widget: "TextField",
    group: null,
    flag_config: { flag, required },
    render_paths: [],
    slot_order: null,
    props: {},
    ...overrides,
  };
}

const EMPTY_TOOL_FORM_STATE = {
  values: {},
  uiComponents: null,
  isReady: false,
  groupLabelMap: {},
  isThinking: false,
};

describe("useToolFormSync", () => {
  let mockDispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDispatch = vi.fn();
    vi.mocked(useAppDispatch).mockReturnValue(
      mockDispatch as unknown as AppDispatch
    );
    vi.mocked(useAppSelector).mockReturnValue(EMPTY_TOOL_FORM_STATE);
  });

  describe("initToolForm dispatch", () => {
    it("dispatches initToolForm on mount when sendMessageDirectly is provided", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text")];

      renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        initToolForm({ uiComponents: components, groupLabelMap: undefined })
      );
    });

    it("does NOT dispatch initToolForm when sendMessageDirectly is undefined", () => {
      const components = [makeComponent("text", "--text")];

      renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: undefined,
          isThinking: false,
          uiComponents: components,
        })
      );

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "toolForm/initToolForm" })
      );
    });

    it("re-dispatches initToolForm when uiComponents reference changes", () => {
      const sendFn = vi.fn();
      const components1 = [makeComponent("text", "--text")];
      const components2 = [makeComponent("mode", "@", true)];

      const { rerender } = renderHook(
        ({ ui }: { ui: UIComponent[] }) =>
          useToolFormSync({
            sendMessageDirectly: sendFn,
            isThinking: false,
            uiComponents: ui,
          }),
        { initialProps: { ui: components1 } }
      );

      const firstCallCount = mockDispatch.mock.calls.filter(
        (c) => c[0]?.type === "toolForm/initToolForm"
      ).length;

      rerender({ ui: components2 });

      const secondCallCount = mockDispatch.mock.calls.filter(
        (c) => c[0]?.type === "toolForm/initToolForm"
      ).length;

      expect(secondCallCount).toBe(firstCallCount + 1);
    });

    it("does NOT re-dispatch initToolForm when uiComponents reference is unchanged", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text")];

      const { rerender } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      const countAfterMount = mockDispatch.mock.calls.filter(
        (c) => c[0]?.type === "toolForm/initToolForm"
      ).length;

      rerender();

      const countAfterRerender = mockDispatch.mock.calls.filter(
        (c) => c[0]?.type === "toolForm/initToolForm"
      ).length;

      expect(countAfterRerender).toBe(countAfterMount);
    });
  });

  describe("isThinking sync", () => {
    it("dispatches updateIsThinking when the prop changes", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text")];

      const { rerender } = renderHook(
        ({ thinking }: { thinking: boolean }) =>
          useToolFormSync({
            sendMessageDirectly: sendFn,
            isThinking: thinking,
            uiComponents: components,
          }),
        { initialProps: { thinking: false } }
      );

      mockDispatch.mockClear();

      rerender({ thinking: true });

      expect(mockDispatch).toHaveBeenCalledWith(updateIsThinking(true));
    });

    it("does NOT dispatch updateIsThinking when sendMessageDirectly is undefined", () => {
      const { rerender } = renderHook(
        ({ thinking }: { thinking: boolean }) =>
          useToolFormSync({
            sendMessageDirectly: undefined,
            isThinking: thinking,
          }),
        { initialProps: { thinking: false } }
      );

      mockDispatch.mockClear();
      rerender({ thinking: true });

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "toolForm/updateIsThinking" })
      );
    });
  });

  describe("unmount cleanup", () => {
    it("dispatches clearToolForm and updateIsThinking(false) on unmount", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text")];

      const { unmount } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      mockDispatch.mockClear();
      unmount();

      expect(mockDispatch).toHaveBeenCalledWith(clearToolForm());
      expect(mockDispatch).toHaveBeenCalledWith(updateIsThinking(false));
    });

    it("does not dispatch cleanup on unmount if never registered", () => {
      const { unmount } = renderHook(() =>
        useToolFormSync({ sendMessageDirectly: undefined, isThinking: false })
      );

      mockDispatch.mockClear();
      unmount();

      expect(mockDispatch).not.toHaveBeenCalledWith(clearToolForm());
    });
  });

  describe("submit()", () => {
    it("calls sendMessageDirectly with the serialized message", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text", false)];

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: components,
        values: { text: "hello" },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      act(() => {
        result.current.submit();
      });

      expect(sendFn).toHaveBeenCalledWith("--text=hello", {
        toolName: "",
        fields: [{ label: "text", value: "hello" }],
      });
    });

    it("does not call sendMessageDirectly when required fields are missing", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text", true)];

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: components,
        values: { text: undefined },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      act(() => {
        result.current.submit();
      });

      expect(sendFn).not.toHaveBeenCalled();
    });

    it("does not call sendMessageDirectly when sendMessageDirectly is undefined", () => {
      const components = [makeComponent("text", "--text", false)];

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: components,
        values: { text: "hello" },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: undefined,
          isThinking: false,
          uiComponents: components,
        })
      );

      act(() => {
        result.current.submit();
      });
    });

    it("dispatches setValues with post-submit values after sending", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text", false)];

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: components,
        values: { text: "hello" },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      act(() => {
        result.current.submit();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "toolForm/setValues" })
      );
    });
  });

  describe("submitPartial()", () => {
    it("calls sendMessageDirectly even when required fields are missing", () => {
      const sendFn = vi.fn();
      const requiredComponent = makeComponent("mode", "@", true);
      const optionalComponent = makeComponent("text", "--text", false);

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: [requiredComponent, optionalComponent],
        values: { mode: undefined, text: "hello" },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: [requiredComponent, optionalComponent],
        })
      );

      act(() => {
        result.current.submitPartial();
      });

      expect(sendFn).toHaveBeenCalledWith("--text=hello", {
        toolName: "",
        fields: [{ label: "text", value: "hello" }],
      });
    });

    it("does not call sendMessageDirectly when serialized message is empty", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text", false)];

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: components,
        values: { text: undefined },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      act(() => {
        result.current.submitPartial();
      });

      expect(sendFn).not.toHaveBeenCalled();
    });

    it("does not call sendMessageDirectly when message is whitespace-only", () => {
      const sendFn = vi.fn();

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: [],
        values: {},
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: [],
        })
      );

      act(() => {
        result.current.submitPartial();
      });

      expect(sendFn).not.toHaveBeenCalled();
    });

    it("dispatches setValues with post-submit values after sending", () => {
      const sendFn = vi.fn();
      const components = [makeComponent("text", "--text", false)];

      vi.mocked(useAppSelector).mockReturnValue({
        ...EMPTY_TOOL_FORM_STATE,
        uiComponents: components,
        values: { text: "hello" },
      });

      const { result } = renderHook(() =>
        useToolFormSync({
          sendMessageDirectly: sendFn,
          isThinking: false,
          uiComponents: components,
        })
      );

      act(() => {
        result.current.submitPartial();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "toolForm/setValues" })
      );
    });
  });
});
