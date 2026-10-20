
"use client";

import { useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";

import { useAppDispatch } from "@/store/hooks";
import { useToasts } from "@/store/selectors";
import { removeToast } from "@/store/slices/toast/toastSlice";

export function ToastContainer() {
  const dispatch = useAppDispatch();
  const queue = useToasts();

  const activeToastId = useRef<string | null>(null);

  useEffect(() => {
    if (activeToastId.current || queue.length === 0) {
      return;
    }

    const nextToast = queue[0];
    activeToastId.current = nextToast.id;

    toast(nextToast.text, {
      id: nextToast.id,
      duration: 4000,
      dismissible: true,
      onDismiss: () => {
        dispatch(removeToast(nextToast.id));
        activeToastId.current = null;
      },
      onAutoClose: () => {
        dispatch(removeToast(nextToast.id));
        activeToastId.current = null;
      },
    });
  }, [queue, dispatch]);

  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      visibleToasts={1}
      expand={false}
    />
  );
}
