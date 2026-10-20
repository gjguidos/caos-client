import type {
  ChatInputConfig,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import type { WorkflowActionPayload } from "@/shared/lib/workflow/workflow.types";
import type {
  FilesSupport,
  ToolDefinition,
} from "@/store/slices/registry/toolsSlice";

/** Re-exported so chat-side code has one file-support type, not a copy. */
export type { FilesSupport };
import type { ConnectionState } from "./websocket.types";

export type { WorkflowActionPayload };

export interface AgentChatClientProps {
  userId: string;
  userName: string;
  agentSystemName: string;
  agentId: string;
  initialAgentData: any; // Agent data from server
  initialAgentType: string; // Agent type from server
}

export interface WorkflowPauseWidgetData {
  runId: string;
  workflowKey?: string;
  workflowName?: string;
  pauseId: string;
  stepId: string;
  prompt: string;
  actions?: string[];
  status: "PAUSED";
}

export interface ChatWidgetMap {
  workflow_pause: WorkflowPauseWidgetData;
}

export type ChatAttachment =
  /** PDF text extracted in the browser — text field holds the raw content, show only the pill */
  | { kind: "extracted"; filename: string }
  /** File uploaded to blob storage — text field holds the user's message, show both */
  | { kind: "ref"; filename: string };

export interface ToolDisplayField {
  label: string;
  value: string;
}

export interface ToolDisplayPayload {
  toolName: string;
  /**
   * What the person actually typed. Kept apart from `fields` because it is the
   * message itself, not a setting on it - the bubble shows it as the body.
   */
  prompt?: string;
  /** The flags the invocation carried, shown as collapsed detail. */
  fields: ToolDisplayField[];
}

export interface ChatMsg {
  sender: "user" | "agent";
  text: string;
  attachment?: ChatAttachment;
  widget?: ChatWidget;
  toolDisplay?: ToolDisplayPayload;
}

export type ChatWidget =
  | {
      type: "workflow_pause";
      data: WorkflowPauseWidgetData;
    }
  | {
      type: string;
      data: unknown;
    };

export interface AgentData {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface AgentDetail {
  id: string;
  name: string;
  role_name: string;
  type: string;
  llm_type?: string;
  rule_pack_ids?: string[];
  tools: Array<{
    key?: string;
    name?: string;
    config?: Record<string, unknown>;
  }>;
  collections: string[];
  personality_key?: string;
}

export interface UseChatMessagesReturn {
  chatMessages: ChatMsg[];
  serverMessages: string[];
  addUserMessage: (
    text: string,
    attachment?: ChatAttachment,
    toolDisplay?: ToolDisplayPayload
  ) => void;
  addAgentMessage: (
    text: string,
    widget?: { type: string; data: unknown }
  ) => void;
  addServerMessage: (text: string) => void;
  clearMessages: () => void;
  clearLastWorkflowPauseWidget: () => void;
}

export interface UseAgentDataOptions {
  agentId: string;
}

export interface EnrichedTool {
  /** Canonical tool key used to invoke the tool, sent as the `@<key>` token. */
  key: string;
  label: string;
  description: string;
  version: string;
  ui?: UIComponent[];
  uiGroupLabelMap?: Record<string, string>;
  uiChatInput?: ChatInputConfig | null;
  supports?: ToolDefinition["supports"];
}

export interface UseAgentDataReturn {
  agentData: any | null;
  agentType: string;
  isLoading: boolean;
  error: string | null;
  enrichedTools: EnrichedTool[];
  hasRagTool: boolean;
  refetch: () => Promise<void>;
  setAgentData: (data: any) => void;
}

export interface UseAgentChatOptions {
  agentSystemName: string;
  agentId: string;
  agentName: string;
  userId: string;
  enabled?: boolean;
  resolveToolDisplay?: (message: string) => ToolDisplayPayload | undefined;
}

export interface UseAgentChatReturn {
  chatMessages: ChatMsg[];
  serverMessages: string[];
  isThinking: boolean;

  inputText: string;
  setInputText: (text: string) => void;

  sendMessage: () => void;
  /** Send a pre-formatted message directly (bypasses input field) */
  sendMessageDirectly: (
    message: string,
    toolDisplay?: ToolDisplayPayload
  ) => void;
  /** Send a formatted message with an array of uploaded file references */
  sendMessageWithFiles: (
    files: import("./websocket.types").FileRef[],
    message: string
  ) => void;
  clearMessages: () => void;
  /** Raw send function for custom payloads (e.g., audio recording) */
  send: (payload: object) => void;
  /** Tag the next outgoing message with a file attachment for display */
  attachFile: (filename: string) => void;
  /** Clear the pending file attachment (e.g., when the user dismisses the file pill) */
  clearAttachment: () => void;

  handleWorkflowAction: (payload: WorkflowActionPayload) => void;

  connectionState: ConnectionState;
  isConnected: boolean;
  canChat: boolean;
}
