import { markdownToPlainText } from "@/shared/lib/markdownToPlainText";
import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboard(resetTimeout = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), resetTimeout);
        return true;
      } catch {
        return false;
      }
    },
    [resetTimeout]
  );

  const copyAsPlainText = useCallback(
    async (markdown: string) => {
      return copy(markdownToPlainText(markdown));
    },
    [copy]
  );

  return { copy, copyAsPlainText, copied };
}
