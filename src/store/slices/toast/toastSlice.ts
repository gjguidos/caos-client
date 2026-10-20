import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store";

export type ToastVariant =
  | "positive"
  | "negative"
  | "informative"
  | "cautionary";

export type ToastItem = {
  id: string;
  text: string;
  variant: ToastVariant;
};

type ToastState = { queue: ToastItem[] };

const initialState: ToastState = { queue: [] };

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Omit<ToastItem, "id">>) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.queue.push({ ...action.payload, id });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;
export const selectToastQueue = (state: RootState): ToastItem[] =>
  state.toast.queue;
