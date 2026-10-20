import { RefObject, useCallback, useEffect } from "react";

function resize(el: HTMLTextAreaElement, maxRows: number): void {
  el.style.height = "auto";
  const lineHeight = parseInt(window.getComputedStyle(el).lineHeight, 10);
  const maxHeight = lineHeight * maxRows;
  const newHeight = Math.min(el.scrollHeight, maxHeight);
  el.style.height = `${newHeight}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
}

export function useTextareaAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  inputText: string,
  maxRows: number
): (el: HTMLTextAreaElement) => void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    resize(el, maxRows);
  }, [inputText, maxRows, ref]);

  // Stable callback for use in onChange handler
  const handleResize = useCallback(
    (el: HTMLTextAreaElement) => {
      resize(el, maxRows);
    },
    [maxRows]
  );

  return handleResize;
}
