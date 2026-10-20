"use client";

import { useCallback, useRef, useState } from "react";

import {
  parseAgentBridgeEvent,
  type AgentBridgeEvent,
} from "@/app/(workspace)/_agent-runtime/lib/bridgeEvents";
import type {
  ToolDisplayPayload,
  ChatMsg,
} from "@/app/(workspace)/_types/chat.types";
import { useAgentWebSocket } from "@/app/(workspace)/_hooks/useAgentWebSocket";
import type { ParsedWSMessage } from "@/app/(workspace)/_types/websocket.types";
import type {
  DomainEventEnvelope,
  OperationEventData,
} from "@/app/(workspace)/_types/event.types";
import { parseOperationEvent } from "@/app/(workspace)/_types/event.types";
import {
  extractDeliveries,
  extractWidgetData,
} from "@/app/(workspace)/_agent-runtime/_utils/messageParser";

export type FormAgentRunStatus =
  | "idle"
  | "running"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

export type UseFormAgentOptions = {
  agentSystemName: string;
  agentId: string;
  agentName: string;
  userId: string;
  enabled?: boolean;

  interfaceName?: string;
  operationName?: string;

  onBridgeEvent?: (event: AgentBridgeEvent) => void;
};

export type ExecuteOperationCancellation = (
  executeCancel: (
    runId: string
  ) => Promise<void>
) => Promise<void>;

export type UseFormAgentReturn = {
  status: FormAgentRunStatus;
  error: string | null;
  logs: string[];
  messages: ChatMsg[];

  operation: OperationEventData | null;

  reset: () => void;
  sendMessageDirectly: (
    message: string,
    toolDisplay?: ToolDisplayPayload
  ) => void;

  isRunning: boolean;
  isConnected: boolean;
  canExecute: boolean;
  cancelOperation: ExecuteOperationCancellation;
  connectionState: string;
};

/**
 * Drives one tool-backed run over the agent websocket.
 *
 * Chat messages represent conversational/tool acknowledgements.
 *
 * Long-running backend work is represented independently through generic
 * operation.* domain events. This keeps detached operation lifecycle separate
 * from the synchronous chat lifecycle.
 */
export function useFormAgent({
  agentSystemName,
  agentId,
  agentName,
  userId,
  enabled = true,
  interfaceName = "form_agent",
  operationName = "execute",
  onBridgeEvent,
}: UseFormAgentOptions): UseFormAgentReturn {
  const [status, setStatus] =
    useState<FormAgentRunStatus>("idle");

  const [error, setError] =
    useState<string | null>(null);

  const [messages, setMessages] =
    useState<ChatMsg[]>([]);

  const [logs, setLogs] =
    useState<string[]>([]);

  const [operation, setOperation] =
    useState<OperationEventData | null>(null);

  /*
   * The ref lets websocket callbacks make lifecycle decisions without waiting
   * for a React render after setOperation().
   */
  const operationRef =
    useRef<OperationEventData | null>(null);

  const latestProgressRevisionRef = useRef<
    Record<string, number>
  >({});

  const lastLogRef = useRef<string | null>(null);

  const cancellationInFlightRef = useRef(false);

  const addLog = useCallback(
    (message: string) => {
      if (
        lastLogRef.current === message
      ) {
        return;
      }
  
      lastLogRef.current = message;
  
      setLogs((current) => [
        ...current,
        message,
      ]);
    },
    []
  );

  const cancelOperation =
  useCallback<
    ExecuteOperationCancellation
  >(
    async (executeCancel) => {
      const currentOperation =
        operationRef.current;

      const runId =
        currentOperation?.run_id;

      if (!runId) {
        const message =
          "No active operation is available to cancel.";

        setError(message);

        throw new Error(message);
      }

      if (
        currentOperation.status !==
          "pending" &&
        currentOperation.status !==
          "running"
      ) {
        const message =
          "The operation is not currently cancellable.";

        setError(message);

        throw new Error(message);
      }

      if (
        cancellationInFlightRef.current
      ) {
        return;
      }

      cancellationInFlightRef.current =
        true;

      setStatus("cancelling");
      setError(null);

      try {
        /*
         * The runtime owns the lifecycle and run_id.
         *
         * The caller owns the transport. For the form UI
         * this transport is resolved from the backend
         * operation_binding metadata.
         */
        await executeCancel(runId);
      } catch (error) {
        cancellationInFlightRef.current =
          false;

        /*
         * The backend did not accept the cancellation
         * request, so the operation remains active.
         */
        setStatus("running");

        const message =
          error instanceof Error
            ? error.message
            : "Could not cancel operation.";

        setError(message);

        throw error;
      }
    },
    []
  );

  const handleOperationEvent = useCallback(
    (envelope: DomainEventEnvelope) => {
      const nextOperation =
        parseOperationEvent(envelope);
  
      if (!nextOperation) {
        return;
      }

      /*
       * Progress events can arrive out of order once multiple consumers
       * publish updates concurrently. Reject only stale progress events.
       * Terminal lifecycle events must always be processed.
       */
      if (
        envelope.event_type === "operation.progress"
      ) {
        const progressRevision = (
          nextOperation as OperationEventData & {
            progress_revision?: number;
          }
        ).progress_revision;

        if (typeof progressRevision === "number") {
          const latestRevision =
            latestProgressRevisionRef.current[
              nextOperation.run_id
            ] ?? -1;

          if (progressRevision <= latestRevision) {
            return;
          }

          latestProgressRevisionRef.current[
            nextOperation.run_id
          ] = progressRevision;
        }
      }
  
      operationRef.current = nextOperation;
      setOperation(nextOperation);
  
      /*
       * Progress events contribute their progress message
       * to the Events timeline.
       */
      if (
        envelope.event_type === "operation.progress"
      ) {
        const progressMessage =
          nextOperation.progress?.message;
  
        if (progressMessage) {
          addLog(progressMessage);
        }
      }
  
      /*
       * Lifecycle events contribute their backend-provided
       * lifecycle message to the Events timeline.
       */
      if (
        envelope.event_type !== "operation.progress" &&
        nextOperation.message
      ) {
        addLog(nextOperation.message);
      }
  
      switch (nextOperation.status) {
        case "pending":
        case "running":
          setStatus((current) =>
            current === "cancelling"
              ? "cancelling"
              : "running"
          );

          setError(null);
          break;
          
          case "completed": {
            cancellationInFlightRef.current =
              false;
          
            setStatus("completed");
            setError(null);
          
            const result =
              nextOperation.result;
          
            if (result) {
              const text =
                extractOperationResultText(
                  result
                );
          
              const deliveries =
                extractDeliveries(result);
          
              console.log(
                "[FORM][DELIVERY][RESULT]",
                result
              );
          
              console.log(
                "[FORM][DELIVERY][EXTRACTED]",
                deliveries
              );
          
              if (text) {
                setMessages((current) => [
                  ...current,
                  {
                    sender: "agent",
                    text,
                    ...(deliveries.length > 0 && {
                      deliveries,
                    }),
                  },
                ]);
              }
            }
          
            break;
          }
  
        case "failed": {
          cancellationInFlightRef.current =
            false;
        
          setStatus("failed");
        
          const operationError =
            extractOperationError(
              nextOperation
            );
        
          setError(operationError);
          break;
        }

        case "cancelled":
          cancellationInFlightRef.current =
            false;
        
          setStatus("cancelled");
          setError(null);
          break;
      }
    },
    [addLog]
  );

  const handleMessage = useCallback(
    (parsed: ParsedWSMessage) => {
      if (parsed.type === "bridge") {
        const bridgeEvent =
          parseAgentBridgeEvent(parsed.raw);

        if (bridgeEvent) {
          onBridgeEvent?.(bridgeEvent);
          addLog(formatBridgeEvent(bridgeEvent));
        }

        return;
      }

      if (parsed.type === "domain_event") {
        const envelope =
          parsed.payload as DomainEventEnvelope;

        if (
          envelope.event_type.startsWith("operation.")
        ) {
          handleOperationEvent(envelope);
        }

        return;
      }

      if (parsed.type === "chat") {
        const activeOperation =
          operationRef.current;
      
        const hasActiveOperation =
          activeOperation?.status === "pending" ||
          activeOperation?.status === "running";
      
        /*
         * A detached operation returns a short acknowledgement
         * through the ordinary chat transport.
         *
         * The operation domain events are authoritative for the
         * operation lifecycle, so do not surface that acknowledgement
         * as either Result or Event content.
         */
        if (hasActiveOperation) {
          return;
        }
      
        if (parsed.text) {
          const widget =
            extractWidgetData(parsed.raw);
      
          setMessages((current) => [
            ...current,
            {
              sender: "agent",
              text: parsed.text ?? "",
              widget: widget ?? undefined,
            },
          ]);
        }
      
        setStatus("completed");
        setError(null);
      
        return;
      }
    },
    [
      addLog,
      handleOperationEvent,
      onBridgeEvent,
    ]
  );

  const handleLog = useCallback(
    (message: string) => {
      addLog(message);
    },
    [addLog]
  );

  const ws = useAgentWebSocket({
    agentSystemName,
    agentName,
    enabled:
      enabled &&
      Boolean(agentSystemName) &&
      Boolean(agentName) &&
      Boolean(userId),
    onMessage: handleMessage,
    onLog: handleLog,
  });

  const canExecute =
    ws.isConnected &&
    Boolean(agentName) &&
    Boolean(userId) &&
    status !== "running";

  const sendMessageDirectly = useCallback(
    (
      message: string,
      _toolDisplay?: ToolDisplayPayload
    ) => {
      const trimmed = message.trim();

      if (
        !trimmed ||
        !ws.isConnected ||
        !agentName ||
        !userId
      ) {
        setError(
          "Form-agent connection is not ready."
        );
        return;
      }

      operationRef.current = null;
      latestProgressRevisionRef.current = {};
      lastLogRef.current = null;
      setOperation(null);

      setStatus("running");
      setError(null);
      setLogs([]);

      ws.send({
        event: `${agentSystemName}.comm`,
        user_id: userId,
        agent_id: agentId,
        agent_system_name: agentSystemName,
        agent_name: agentName,
        data: {
          message: trimmed,
          tool_kwargs: {},
          metadata: {
            interface: interfaceName,
            operation: operationName,
          },
        },
      });
    },
    [
      ws,
      agentSystemName,
      agentId,
      agentName,
      userId,
      interfaceName,
      operationName,
    ]
  );

  const reset = useCallback(() => {
    operationRef.current = null;
    latestProgressRevisionRef.current = {};
    lastLogRef.current = null;

    setStatus("idle");
    setError(null);
    setLogs([]);
    setMessages([]);
    setOperation(null);
  }, []);

  return {
    status,
    error,
    logs,
    messages,
    operation,
  
    reset,
    sendMessageDirectly,
    cancelOperation,
  
    isRunning:
      status === "running" ||
      status === "cancelling",
  
    isConnected: ws.isConnected,
    canExecute,
    connectionState: ws.connectionState,
  };
}

function extractOperationError(
  operation: OperationEventData
): string {
  const error = operation.error;

  if (!error) {
    return "Operation failed.";
  }

  const message = error.message;

  if (typeof message === "string" && message) {
    return message;
  }

  const detail = error.detail;

  if (typeof detail === "string" && detail) {
    return detail;
  }

  return "Operation failed.";
}

function formatBridgeEvent(
  event: AgentBridgeEvent
): string {
  const lines = [
    event.message ??
      humanizeBridgeEventType(event.type),
  ];

  if (
    event.data &&
    typeof event.data === "object"
  ) {
    for (
      const [key, value] of Object.entries(
        event.data
      )
    ) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        lines.push(`${key}: ${String(value)}`);
      }
    }
  }

  return lines.join("\n");
}

function humanizeBridgeEventType(
  type: string
): string {
  return type
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase()
    );
}

function extractOperationResultText(
  result: Record<string, unknown>
): string | null {
  const candidates = [
    result.display_text,
    result.report_text,
    result.answer,
    result.message,
    result.text,
  ];

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value;
    }
  }

  return null;
}
