"use client";

import type {
  FormValue,
  FormValues,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetForm as resetFormAction,
  selectToolForm,
  setValue as setValueAction,
} from "@/store/slices/toolForm/toolFormSlice";
import { useCallback } from "react";

export function useToolForm() {
  const dispatch = useAppDispatch();

  const {
    isReady,
    uiComponents,
    groupLabelMap,
    chatInputConfig,
    values,
    isThinking,
  } = useAppSelector(selectToolForm);

  const setValue = useCallback(
    (key: string, value: FormValue) => dispatch(setValueAction({ key, value })),
    [dispatch]
  );

  const resetForm = useCallback(() => dispatch(resetFormAction()), [dispatch]);

  return {
    isReady,
    uiComponents,
    groupLabelMap,
    chatInputConfig,
    values: values as FormValues,
    isThinking,
    setValue,
    resetForm,
  };
}
