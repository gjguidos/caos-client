import { useCallback, useState } from "react";
import type {
  ChatAttachment,
  ChatMsg,
  DeliveredResource,
  ToolDisplayPayload,
  UseChatMessagesReturn,
} from "@/app/(workspace)/_types/chat.types";

export function useChatMessages(): UseChatMessagesReturn {
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [serverMessages, setServerMessages] = useState<string[]>([]);

  const clearLastWorkflowPauseWidget = useCallback(() => {
    setChatMessages((prev) => {
      const copy = [...prev];

      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].widget?.type === "workflow_pause") {
          copy[i] = { ...copy[i], widget: undefined };
          break;
        }
      }

      return copy;
    });
  }, []);

  const addUserMessage = useCallback(
    (
      text: string,
      attachment?: ChatAttachment,
      toolDisplay?: ToolDisplayPayload
    ) => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text,
          ...(attachment && { attachment }),
          ...(toolDisplay && { toolDisplay }),
        },
      ]);
    },
    []
  );

  const addAgentMessage = useCallback(
    (
      text: string,
      widget?: { type: string; data: unknown },
      deliveries?: DeliveredResource[]
    ) => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text,
          ...(widget && { widget }),
          ...(deliveries?.length && { deliveries }),
        },
      ]);
    },
    []
  );

  const addServerMessage = useCallback((message: string) => {
    setServerMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setChatMessages([]);
    setServerMessages([]);
  }, []);

  return {
    chatMessages,
    serverMessages,
    addUserMessage,
    addAgentMessage,
    addServerMessage,
    clearMessages,
    clearLastWorkflowPauseWidget,
  };
}
