"use client";

import {
  createPostSubmitValues,
  hasRequiredUIComponentValues,
  serializeUIComponents,
} from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import { buildToolDisplay } from "@/app/(workspace)/_tool-form/lib/buildToolDisplay";
import type { ToolDisplayPayload } from "@/app/(workspace)/_types/chat.types";
import type {
  ChatInputConfig,
  OutputProfilesConfig,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearToolForm,
  initToolForm,
  selectToolForm,
  setValues,
  updateIsThinking as updateIsThinkingAction,
} from "@/store/slices/toolForm/toolFormSlice";
import { useCallback, useEffect, useRef } from "react";

export interface UseToolFormSyncOptions {
  sendMessageDirectly:
    | ((message: string, toolDisplay?: ToolDisplayPayload) => void)
    | undefined;
  isThinking: boolean;
  uiComponents?: UIComponent[];
  groupLabelMap?: Record<string, string>;
  chatInputConfig?: ChatInputConfig | null;
  toolName?: string;
  toolKey?: string | null;
  outputProfiles?: OutputProfilesConfig | null;
}

export function useToolFormSync({
  sendMessageDirectly,
  isThinking,
  uiComponents,
  groupLabelMap,
  chatInputConfig,
  toolName,
  toolKey,
  outputProfiles,
}: UseToolFormSyncOptions) {
  const dispatch = useAppDispatch();

  const {
    values,
    uiComponents: registeredComponents,
    chatInputConfig: registeredChatInputConfig,
  } = useAppSelector(selectToolForm);

  const hasRegistered = useRef(false);

  const prevUiComponentsRef = useRef<UIComponent[] | undefined>(undefined);

  const prevGroupLabelMapRef = useRef<Record<string, string> | undefined>(
    undefined
  );

  const prevChatInputConfigRef = useRef<ChatInputConfig | null | undefined>(
    undefined
  );

  const prevOutputProfilesRef = useRef<OutputProfilesConfig | null | undefined>(
    undefined
  );

  // Keep a ref to the latest sendMessageDirectly so submit closures are never stale
  const sendFnRef = useRef(sendMessageDirectly);
  sendFnRef.current = sendMessageDirectly;

  const toolNameRef = useRef(toolName);
  toolNameRef.current = toolName;

  const toolKeyRef = useRef(toolKey);
  toolKeyRef.current = toolKey;

  // Refs so submit callbacks always read latest Redux state without re-creating
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const registeredComponentsRef = useRef(registeredComponents);
  registeredComponentsRef.current = registeredComponents;

  const registeredChatInputConfigRef = useRef(registeredChatInputConfig);
  registeredChatInputConfigRef.current = registeredChatInputConfig;

  // Register only when uiComponents, groupLabelMap, chatInputConfig or
  // outputProfiles change, or on mount
  useEffect(() => {
    if (!sendMessageDirectly) return;

    const uiComponentsChanged = uiComponents !== prevUiComponentsRef.current;

    const groupLabelMapChanged = groupLabelMap !== prevGroupLabelMapRef.current;

    const chatInputConfigChanged =
      chatInputConfig !== prevChatInputConfigRef.current;

    const outputProfilesChanged =
      outputProfiles !== prevOutputProfilesRef.current;

    if (
      uiComponentsChanged ||
      groupLabelMapChanged ||
      chatInputConfigChanged ||
      outputProfilesChanged ||
      !hasRegistered.current
    ) {
      dispatch(
        initToolForm({
          uiComponents,
          groupLabelMap,
          chatInputConfig,
          outputProfiles,
        })
      );

      hasRegistered.current = true;
      prevUiComponentsRef.current = uiComponents;
      prevGroupLabelMapRef.current = groupLabelMap;
      prevChatInputConfigRef.current = chatInputConfig;
      prevOutputProfilesRef.current = outputProfiles;
    }
  }, [
    sendMessageDirectly,
    uiComponents,
    groupLabelMap,
    chatInputConfig,
    outputProfiles,
    dispatch,
  ]);

  // Update isThinking separately whenever it changes
  useEffect(() => {
    if (!sendMessageDirectly || !hasRegistered.current) return;

    dispatch(updateIsThinkingAction(isThinking));
  }, [isThinking, dispatch, sendMessageDirectly]);

  // Unregister on unmount
  useEffect(() => {
    return () => {
      if (hasRegistered.current) {
        dispatch(updateIsThinkingAction(false));
        dispatch(clearToolForm());
      }
    };
  }, [dispatch]);

  const submit = useCallback(() => {
    const currentComponents = registeredComponentsRef.current;
    const currentChatInputConfig = registeredChatInputConfigRef.current;
    const currentValues = valuesRef.current;

    if (!currentComponents || !sendFnRef.current) return;

    if (
      !hasRequiredUIComponentValues(
        currentValues,
        currentComponents,
        currentChatInputConfig
      )
    ) {
      return;
    }

    const message = serializeUIComponents(
      currentValues,
      currentComponents,
      currentChatInputConfig,
      toolKeyRef.current
    );

    const toolDisplay = buildToolDisplay(
      currentValues,
      currentComponents,
      toolNameRef.current ?? "",
      currentChatInputConfig
    );

    sendFnRef.current(message, toolDisplay);

    dispatch(
      setValues(
        createPostSubmitValues(
          currentComponents,
          currentValues,
          currentChatInputConfig
        )
      )
    );
  }, [dispatch]);

  const submitPartial = useCallback(() => {
    const currentComponents = registeredComponentsRef.current;
    const currentChatInputConfig = registeredChatInputConfigRef.current;
    const currentValues = valuesRef.current;

    if (!currentComponents || !sendFnRef.current) return;

    const message = serializeUIComponents(
      currentValues,
      currentComponents,
      currentChatInputConfig,
      toolKeyRef.current
    );

    if (!message.trim()) return;

    const toolDisplay = buildToolDisplay(
      currentValues,
      currentComponents,
      toolNameRef.current ?? "",
      currentChatInputConfig
    );

    sendFnRef.current(message, toolDisplay);

    dispatch(
      setValues(
        createPostSubmitValues(
          currentComponents,
          currentValues,
          currentChatInputConfig
        )
      )
    );
  }, [dispatch]);

  return {
    submit,
    submitPartial,
  };
}
