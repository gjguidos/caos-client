"use client";

import { Button } from "@/components/ui/button";
import { AgentDetailsDialog } from "@/shared/components/AgentDetailsDialog/AgentDetailsDialog";
import { PromptBubble } from "../../_components/PromptBubble/PromptBubble";
import { ResponseBubble } from "@/app/(workspace)/_components/ResponseBubble/ResponseBubble";
import { WorkflowPauseWidget } from "@/app/(workspace)/_components/widgets/WorkflowPauseWidget";
import type { WorkflowPauseWidgetData } from "@/app/(workspace)/_types/chat.types";
import { ToolChatBar } from "../../_components/ToolChatBar/ToolChatBar";
import { SetupDialog } from "../../_components/dialogs/SingleRagCollectionSetup";
import { getWidget } from "@/app/(workspace)/_components/widgets/widgetRegistry";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { defaultToolKeyForRole } from "@/shared/lib/toolKeys";
import { useToolFormSync } from "@/app/(workspace)/_tool-form/hooks/useToolFormSync";
import { findToolDisplayFromCommand } from "@/app/(workspace)/_tool-form/lib/parseToolCommand";
import { PageHeader } from "@/shared/components/PageHeader/PageHeader";
import { withReturnTo } from "@/shared/lib/navigation/returnTo";
import { Info, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AgentMessage } from "@/app/(workspace)/_components/AgentMessage/AgentMessage";
import { EmptyConversation } from "../../_components/EmptyConversation/EmptyConversation";
import {
  messageOrigins,
  type MessageOrigin,
} from "../../_utils/messageOrigins";
import { useAgentChat } from "@/app/(workspace)/_hooks/useAgentChat";
import { useAgentData } from "@/app/(workspace)/_hooks/useAgentData";
import type { ChatMsg } from "@/app/(workspace)/_types/chat.types";

export default function AgentChat() {
  const { agent_system_name, agent_id } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const { userId, isAuthLoading, canCreateAgent } = useAuth();

  const [currentCollection, setCurrentCollection] = useState<string | null>(
    null
  );
  const [showSetup, setShowSetup] = useState(false);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [currentToolKey, setCurrentToolKey] = useState<string | null>(null);

  // Refs for scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const serverListRef = useRef<HTMLUListElement>(null);
  const appliedDefaultTool = useRef(false);

  const agent = useAgentData({
    agentId: agent_id as string,
  });
  const isV2 = agent.agentData?.runtime_version === "v2";
  useEffect(() => {
    if (isV2)
      router.replace(
        `/v2/conversations?agent=${encodeURIComponent(agent_id as string)}`
      );
  }, [isV2, router, agent_id]);
  const agentName: string = agent.agentData?.name ?? "";
  // `role_name` is a role registry key; it selects the pre-opened tool.
  const roleKey: string = agent.agentData?.role_name ?? "";
  const defaultToolKey = defaultToolKeyForRole(roleKey, agent.enrichedTools);

  // Pre-select the role's tool once the agent (and so its tools) has loaded.
  // One-shot: dismissing the tool must not immediately re-select it.
  useEffect(() => {
    if (appliedDefaultTool.current || !defaultToolKey) return;
    appliedDefaultTool.current = true;
    setCurrentToolKey(defaultToolKey);
  }, [defaultToolKey]);

  const chat = useAgentChat({
    agentSystemName: agent_system_name as string,
    agentId: agent_id as string,
    agentName,
    userId: userId ?? "",
    enabled: !!agent.agentData?.name && !!userId && !isV2,
    resolveToolDisplay: (message) =>
      findToolDisplayFromCommand(message, agent.enrichedTools),
  });

  // Register tool form bridge for sidebar integration
  const currentToolDef = useMemo(
    () => agent.enrichedTools.find((t) => t.key === currentToolKey),
    [agent.enrichedTools, currentToolKey]
  );
  const uiComponents = currentToolDef?.ui;
  const uiGroupLabelMap = currentToolDef?.uiGroupLabelMap;
  const chatInputConfig = currentToolDef?.uiChatInput ?? null;

  const { submit: toolFormSubmit, submitPartial: toolFormSubmitPartial } =
    useToolFormSync({
      sendMessageDirectly: chat.sendMessageDirectly,
      isThinking: chat.isThinking,
      uiComponents,
      groupLabelMap: uiGroupLabelMap,
      chatInputConfig,
      toolName: currentToolDef?.label ?? "",
      toolKey: currentToolDef?.key ?? null,
      outputProfiles: currentToolDef?.uiOutputProfiles ?? null,
    });

  useEffect(() => {
    if (!agent.agentData) return;

    if (agent.hasRagTool) {
      if (agent.agentData.collections?.length) {
        setCurrentCollection(agent.agentData.collections[0]);
        setShowSetup(false);
      } else {
        setCurrentCollection(null);
        setShowSetup(true);
      }
    } else {
      setShowSetup(false);
    }
  }, [agent.agentData, agent.hasRagTool]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chat.chatMessages]);

  useEffect(() => {
    const el = serverListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.serverMessages]);

  const isConversationEmpty =
    chat.chatMessages.length === 0 && !chat.isThinking;

  const origins = useMemo(
    () => messageOrigins(chat.chatMessages),
    [chat.chatMessages]
  );

  const responseBubble = (m: ChatMsg) =>
    m.text && <ResponseBubble message={m} uiComponents={uiComponents} />;

  /**
   * What one agent turn contains. The three shapes are chosen here rather than
   * layered on top of each other, so no two of them can render together: a
   * registered widget stands in for the text bubble, a workflow pause
   * accompanies it, and everything else is text alone.
   */
  const renderAgentBody = (m: ChatMsg, origin: MessageOrigin) => {
    const widget = m.widget;
    if (!widget) return responseBubble(m);

    if (widget.type === "workflow_pause") {
      return (
        <>
          {responseBubble(m)}
          <WorkflowPauseWidget
            data={widget.data as WorkflowPauseWidgetData}
            onAction={chat.handleWorkflowAction}
          />
        </>
      );
    }

    const Widget = getWidget(widget.type);
    if (!Widget) return responseBubble(m);

    return <Widget data={widget.data} sourceText={origin.requestText} />;
  };

  const renderMessage = (m: ChatMsg, idx: number) => {
    const origin = origins[idx];

    if (m.sender === "user") {
      return <PromptBubble key={idx} message={m} source={origin.source} />;
    }

    return (
      <AgentMessage key={idx} source={origin.source}>
        {renderAgentBody(m, origin)}
      </AgentMessage>
    );
  };

  if (isV2) return <p role="status">Opening V2 conversation setup...</p>;

  // Loading auth
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
          <p className="mt-4 text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  // Local mode should supply a user via the session provider. If it does not,
  // show an actionable configuration error instead of redirecting to MSAL.
  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-2 text-center" role="alert">
          <h1 className="text-xl font-semibold">Session unavailable</h1>
          <p className="text-sm text-muted-foreground">
            The application could not resolve a user session. Check the local
            authentication configuration and reload the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SetupDialog
        agent_id={agent_id as string}
        user_id={userId}
        agent_name={agent.agentData?.name}
        showSetup={showSetup}
        setShowSetup={setShowSetup}
        setCurrentCollection={setCurrentCollection}
        setAgentData={agent.setAgentData}
      />
      {/* `min-h-0` lets this column be squeezed to the height it is given. Without
          it a flex item floors at its content height, so a grown composer pushes
          the column past `main`, which clips it - taking the footer off screen. */}
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4">
        <div className="pt-2">
          <PageHeader
            title={agentName}
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Agent details"
                  title="Agent details"
                  onClick={() => setShowAgentDetails(true)}
                >
                  <Info className="size-4" aria-hidden="true" />
                </Button>
                {/* Editing is two clicks from the conversation, and Save comes
                    straight back here rather than stranding you in a builder. */}
                {canCreateAgent && (
                  <Button type="button" variant="ghost" size="icon" asChild>
                    <Link
                      href={withReturnTo(
                        `/agents/${agent_id as string}/edit`,
                        pathname
                      )}
                      aria-label="Edit agent"
                      title="Edit agent"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </>
            }
          />
          {showAgentDetails && (
            <AgentDetailsDialog
              agentData={agent.agentData}
              onClose={() => setShowAgentDetails(false)}
            />
          )}
        </div>
        <div
          ref={chatContainerRef}
          className="min-h-0 flex-1 overflow-y-auto rounded-lg px-4 pb-4"
        >
          {isConversationEmpty && agentName && (
            <EmptyConversation
              agentName={agentName}
              personalityKey={agent.agentData?.personality_key}
            />
          )}
          {chat.chatMessages.map(renderMessage)}
          {chat.isThinking && (
            <div
              className="my-2 flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              <span>Agent is thinking...</span>
            </div>
          )}
        </div>
        <div
          className={`pb-1 pt-4 ${!chat.canChat ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={!chat.canChat}
        >
          <ToolChatBar
            inputText={chat.inputText}
            setInputText={chat.setInputText}
            onSubmit={chat.sendMessage}
            onToolFormSubmit={toolFormSubmit}
            onToolFormSubmitPartial={toolFormSubmitPartial}
            onSendWithFiles={chat.sendMessageWithFiles}
            agent_id={agent_id as string}
            currentCollection={currentCollection}
            user_id={userId}
            chatIsready={chat.canChat}
            isThinking={chat.isThinking}
            currentToolKey={currentToolKey}
            setCurrentToolKey={setCurrentToolKey}
            tools={agent.enrichedTools}
            onFileAttached={chat.attachFile}
            onFileDismissed={chat.clearAttachment}
          />
        </div>

        <style>{`
          @keyframes bounce {
            0%,
            100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}</style>
      </div>
    </>
  );
}
