"use client";
import { useAppDispatch } from "@/store/hooks";
import { addToast, type ToastVariant } from "@/store/slices/toast/toastSlice";
import { useCallback } from "react";

type ShowToastOptions = { description?: string };

export function useToast() {
  const dispatch = useAppDispatch();

  const show = useCallback(
    (text: string, variant: ToastVariant, options?: ShowToastOptions) => {
      const fullText = options?.description
        ? `${text}: ${options.description}`
        : text;
      dispatch(addToast({ text: fullText, variant }));
    },
    [dispatch]
  );

  const showSuccess = useCallback(
    (text: string, opts?: ShowToastOptions) => show(text, "positive", opts),
    [show]
  );
  const showError = useCallback(
    (text: string, opts?: ShowToastOptions) => show(text, "negative", opts),
    [show]
  );
  const showInfo = useCallback(
    (text: string, opts?: ShowToastOptions) => show(text, "informative", opts),
    [show]
  );
  const showWarning = useCallback(
    (text: string, opts?: ShowToastOptions) => show(text, "cautionary", opts),
    [show]
  );

  return { showSuccess, showError, showInfo, showWarning };
}
