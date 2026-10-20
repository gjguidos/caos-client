import { useCallback, useRef, useState } from "react";
import { parseRunSnapshot } from "@/shared/lib/workflow/parseRunEvent";
import { encodeResume } from "@/shared/lib/workflow/workflowCommand";
import type { WorkflowRunSnapshot } from "@/shared/lib/workflow/workflow.types";
import { extractWidgetData } from "../_utils/messageParser";
import type {
  ToolDisplayPayload,
  UseAgentChatOptions,
  UseAgentChatReturn,
  WorkflowActionPayload,
} from "../chat.types";
import type { FileRef, ParsedWSMessage } from "../websocket.types";
import { useAgentWebSocket } from "./useAgentWebSocket";
import { useChatMessages } from "./useChatMessages";

/** Build the chat pause widget from a normalized, PAUSED run snapshot. */
function toWorkflowPauseWidget(snapshot: WorkflowRunSnapshot) {
  const pause = snapshot.pause;
  return {
    type: "workflow_pause",
    data: {
      runId: snapshot.runId,
      workflowKey: pause?.workflowKey ?? snapshot.workflowKey ?? undefined,
      workflowName: pause?.workflowName ?? snapshot.workflowName,
      pauseId: pause?.pauseId ?? "",
      stepId: pause?.stepId ?? "pause",
      prompt: pause?.prompt ?? "Workflow paused. Review before continuing.",
      actions: pause?.actions ?? ["continue", "cancel"],
      status: "PAUSED" as const,
    },
  };
}

export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
  const {
    agentSystemName,
    agentId,
    agentName,
    userId,
    enabled = true,
    resolveToolDisplay,
  } = options;

  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const pendingAttachmentRef = useRef<
    import("../chat.types").ChatAttachment | null
  >(null);

  const messages = useChatMessages();
  const {
    addAgentMessage,
    addServerMessage,
    addUserMessage,
    clearLastWorkflowPauseWidget,
  } = messages;

  const handleMessage = useCallback(
    (parsed: ParsedWSMessage) => {
      if (parsed.type === "chat") {
        const snapshot = parseRunSnapshot(parsed.raw);
        if (snapshot?.runStatus === "PAUSED" && snapshot.pause) {
          const widget = toWorkflowPauseWidget(snapshot);
          const text: string = parsed.text || "";
          addAgentMessage(text, widget);
          setIsThinking(false);
          return;
        }

        if (parsed.text != null) {
          const widget = extractWidgetData(parsed.payload);
          addAgentMessage(parsed.text, widget ?? undefined);
        } else {
          addServerMessage(JSON.stringify(parsed.raw));
        }

        setIsThinking(false);
      } else {
        addServerMessage(parsed.text ?? JSON.stringify(parsed.raw));
      }
    },
    [addAgentMessage, addServerMessage]
  );

  const handleLog = useCallback(
    (message: string) => {
      addServerMessage(message);
    },
    [addServerMessage]
  );

  const ws = useAgentWebSocket({
    agentSystemName,
    agentName,
    enabled: enabled && !!agentName,
    onMessage: handleMessage,
    onLog: handleLog,
  });

  const canChat = ws.isConnected && !!agentName && !!userId;

  const wsSend = useCallback(
    (message: string, files?: FileRef[]) => {
      ws.send({
        event: `${agentSystemName || ""}.comm`,
        user_id: userId,
        agent_id: agentId,
        agent_system_name: agentSystemName,
        agent_name: agentName,
        data: {
          message,
          tool_kwargs: {},
          ...(files && files.length > 0 ? { files } : {}),
        },
      });
    },
    [ws, agentSystemName, userId, agentId, agentName]
  );

  const handleWorkflowAction = useCallback(
    ({ runId, workflowKey, action, data = {} }: WorkflowActionPayload) => {
      if (!canChat) {
        addServerMessage(
          "Connection not ready. Please wait a moment and try again."
        );
        return;
      }

      clearLastWorkflowPauseWidget();

      wsSend(
        encodeResume({
          runId,
          workflowKey,
          action,
          data,
        })
      );

      setIsThinking(true);
    },
    [canChat, addServerMessage, clearLastWorkflowPauseWidget, wsSend]
  );

  // Single send path shared by all public send functions.
  // Attachment display priority: old-style pendingAttachmentRef (PDF extraction
  // flow) takes precedence; falls back to the first FileRef name for the new
  // blob-upload flow so the message appears in history with the filename shown.
  const performSend = useCallback(
    (text: string, files?: FileRef[], toolDisplay?: ToolDisplayPayload) => {
      const attachment = pendingAttachmentRef.current;
      pendingAttachmentRef.current = null;
      wsSend(text, files);
      addUserMessage(
        text,
        attachment ??
          (files?.[0] ? { kind: "ref", filename: files[0].name } : undefined),
        toolDisplay
      );
      setIsThinking(true);
    },
    [wsSend, addUserMessage]
  );

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (!canChat) {
      addServerMessage(
        "Connection not ready. Please wait a moment and try again."
      );
      return;
    }
    const toolDisplay = resolveToolDisplay?.(trimmed);
    performSend(trimmed, undefined, toolDisplay);
    setInputText("");
  }, [inputText, canChat, performSend, addServerMessage, resolveToolDisplay]);

  const sendMessageWithFiles = useCallback(
    (files: FileRef[], message: string) => {
      const trimmed = message.trim();
      if (!trimmed || !canChat) return;
      const toolDisplay = resolveToolDisplay?.(trimmed);
      performSend(trimmed, files, toolDisplay);
      setInputText("");
    },
    [canChat, performSend, resolveToolDisplay]
  );

  const sendMessageDirectly = useCallback(
    (message: string, toolDisplay?: ToolDisplayPayload) => {
      const trimmed = message.trim();
      if (!trimmed || !canChat) return;
      performSend(trimmed, undefined, toolDisplay);
    },
    [canChat, performSend]
  );

  const attachFile = useCallback((filename: string) => {
    pendingAttachmentRef.current = { kind: "extracted", filename };
  }, []);

  const clearAttachment = useCallback(() => {
    pendingAttachmentRef.current = null;
  }, []);

  return {
    chatMessages: messages.chatMessages,
    serverMessages: messages.serverMessages,
    isThinking,

    inputText,
    setInputText,

    sendMessage,
    sendMessageDirectly,
    sendMessageWithFiles,
    clearMessages: messages.clearMessages,
    send: ws.send,
    attachFile,
    clearAttachment,
    handleWorkflowAction,

    connectionState: ws.connectionState,
    isConnected: ws.isConnected,
    canChat,
  };
}
