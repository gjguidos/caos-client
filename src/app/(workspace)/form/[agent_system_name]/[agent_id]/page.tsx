"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/shared/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import { useToolFormSync } from "@/app/(workspace)/_tool-form/hooks/useToolFormSync";
import { buildToolDisplay } from "@/app/(workspace)/_tool-form/lib/buildToolDisplay";
import { hasMeaningfulValue } from "@/app/(workspace)/_tool-form/lib/profileValues";
import {
  isBrowserSessionBridgeData,
  type AgentBridgeEvent,
} from "@/app/(workspace)/_agent-runtime/lib/bridgeEvents";

import { AgentDetailsDialog } from "@/shared/components/AgentDetailsDialog/AgentDetailsDialog";
import { useAgentData } from "@/app/(workspace)/_hooks/useAgentData";
import type { FormValues } from "@/app/(workspace)/_tool-form/toolForm.types";
import { CrawlerConfigurationSkeleton } from "@/app/(workspace)/_roles/crawler/_components/CrawlerConfigurationSkeleton";
import { FormAgentResultSkeleton } from "@/app/(workspace)/form/_components/FormAgentResultSkeleton";
import { FormAgentConnectionStatusSkeleton } from "@/app/(workspace)/form/_components/FormAgentConnectionStatusSkeleton";
import {
  getFormAgentConfig,
  resolveFormRoleAdapter,
} from "@/app/(workspace)/_agent-runtime/lib/formRoleResolver";

import { useBrowserSession } from "@/app/(workspace)/_capabilities/browser-session/useBrowserSession";
import {
  anonymousSessionValues,
  authenticatedSessionValues,
} from "@/app/(workspace)/_capabilities/browser-session/browserSessionFields";
import { useFormAgent } from "@/app/(workspace)/form/_hooks/useFormAgent";
import { FormAgentWorkspace } from "@/app/(workspace)/form/_components/FormAgentWorkspace";
import { FormAgentResultPanel } from "@/app/(workspace)/form/_components/FormAgentResultPanel";

import { GenericToolConfigurationPanel } from "@/app/(workspace)/_roles/generic/_components/GenericToolConfigurationPanel";
import { logger } from "@/shared/lib/logger";

export default function FormAgentPage() {
  const { agent_system_name, agent_id } = useParams<{
    agent_system_name: string;
    agent_id: string;
  }>();

  const router = useRouter();
  const { userId, isAuthLoading } = useAuth();

  const agent = useAgentData({
    agentId: agent_id,
  });

  const agentName = agent.agentData?.name ?? "";

  const formConfig = useMemo(
    () => getFormAgentConfig(agent.agentData),
    [agent.agentData]
  );

  const roleAdapter = useMemo(
    () => resolveFormRoleAdapter(formConfig),
    [formConfig]
  );

  const adapterContext = useMemo(
    () => ({
      agentData: agent.agentData,
      config: formConfig,
      tools: agent.enrichedTools ?? [],
    }),
    [agent.agentData, formConfig, agent.enrichedTools]
  );

  const primaryTool = useMemo(
    () => roleAdapter.resolveFormTool(adapterContext),
    [roleAdapter, adapterContext]
  );

  const supportsBrowserSession = useMemo(
    () => roleAdapter.supportsBrowserSession?.(adapterContext) ?? false,
    [roleAdapter, adapterContext]
  );

  const { values, setValue } = useToolForm();

  const browserSession = useBrowserSession({
    enabled: supportsBrowserSession,
    autoOpen: true,
  });

  const { browserSessionId, ready: sessionReady } = browserSession;

  const hasResolvedRoleAdapter = Boolean(roleAdapter?.key);
  
  const isConfigurationLoading =
    agent.isLoading ||
    !agent.agentData ||
    !hasResolvedRoleAdapter ||
    !formConfig ||
    !primaryTool;

  const ConfigurationComponent =
    roleAdapter?.ConfigurationComponent ??
    GenericToolConfigurationPanel;
  /*
  * Mirror a captured session into the form. Runs for both routes into an
  * authenticated state - the bridge event below and a manual capture - so
   * neither has to know which fields the run payload needs.
   */
  useEffect(() => {
    if (!supportsBrowserSession || !sessionReady || !browserSessionId) {
      return;
    }

    for (const [key, value] of Object.entries(
      authenticatedSessionValues(browserSessionId)
    )) {
      setValue(key, value);
    }
  }, [supportsBrowserSession, sessionReady, browserSessionId, setValue]);

  const handleBridgeEvent = useCallback(
    (event: AgentBridgeEvent) => {
      if (
        !supportsBrowserSession ||
        event.type !== "browser_session.authenticated"
      ) {
        return;
      }

      if (!isBrowserSessionBridgeData(event.data)) {
        logger.warn(
          "[FormAgentPage] browser session event missing normalized data",
          event.raw
        );
        return;
      }

      browserSession.markAuthenticated({
        browserSessionId: event.data.browserSessionId,
        ready: event.data.ready,
      });
    },
    [supportsBrowserSession, browserSession]
  );

  const formAgent = useFormAgent({
    agentSystemName: agent_system_name,
    agentId: agent_id,
    agentName,
    userId: userId ?? "",
    enabled: Boolean(agentName && userId),
    interfaceName: "form_agent",
    operationName:
      formConfig.default_operation ??
      formConfig.submit_target?.key ??
      primaryTool?.key ??
      "execute",
    onBridgeEvent: handleBridgeEvent,
    
  });

  useToolFormSync({
    sendMessageDirectly: formAgent.sendMessageDirectly,
    isThinking: formAgent.isRunning,
    uiComponents: primaryTool?.ui,
    groupLabelMap: primaryTool?.uiGroupLabelMap,
    chatInputConfig: primaryTool?.uiChatInput ?? null,
    toolName: primaryTool?.label ?? "Tool",
    toolKey: primaryTool?.key ?? "tool",
    outputProfiles: primaryTool?.uiOutputProfiles ?? null,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  const requiresBrowserSession =
    supportsBrowserSession && values.auth_mode === "delegated_session";

  /*
   * The sign-in target is whatever the form's primary input holds - the crawler
   * spells that `url`, and the chat-input config names it for anything else.
   */
  const browserSessionTargetUrl = String(
    values[primaryTool?.uiChatInput?.id ?? "url"] ?? values.url ?? ""
  );

  const handleStartBrowserSession = useCallback(() => {
    void browserSession.start(browserSessionTargetUrl);
  }, [browserSession, browserSessionTargetUrl]);

  const handleCaptureBrowserSession = useCallback(() => {
    void browserSession.capture();
  }, [browserSession]);

  const canExecute = useMemo(() => {
    if (!formAgent.canExecute) {
      return false;
    }

    if (!primaryTool) {
      return false;
    }

    const chatInputId = primaryTool.uiChatInput?.id;
    const requiredField =
      primaryTool.uiChatInput?.flag === "--url" ? "url" : chatInputId;

    if (requiredField && !hasMeaningfulValue(values[requiredField])) {
      return false;
    }

    if (requiresBrowserSession && !browserSession.ready) {
      return false;
    }

    return true;
  }, [
    formAgent.canExecute,
    primaryTool,
    values,
    requiresBrowserSession,
    browserSession.ready,
  ]);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setFormError(null);

    if (!primaryTool) {
      setFormError("No form tool is available for this agent.");
      return;
    }

    const effectiveValues = buildEffectiveSubmitValues({
      values,
      browserSessionSupported: supportsBrowserSession,
      browserSessionId: browserSession.ready
        ? browserSession.browserSessionId
        : null,
    });

    const message = roleAdapter.buildSubmitMessage({
      values: effectiveValues,
      tool: primaryTool,
      config: formConfig,
    });

    console.log(message)

    const toolDisplay = buildToolDisplay(
      effectiveValues,
      primaryTool.ui ?? [],
      primaryTool.label ?? "Tool",
      primaryTool.uiChatInput ?? null
    );

    formAgent.reset();
    formAgent.sendMessageDirectly(message, toolDisplay);
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Button size="lg" onClick={() => router.push("/api/auth/login")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <>
      <FormAgentWorkspace
        loading={isConfigurationLoading}
        title={agentName || primaryTool?.label || "Form agent"}
        description={
          primaryTool?.description ??
          "Configure and run a tool-backed operation."
        }
        details={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowAgentDetails(true)}
          >
            Agent details
          </Button>
        }
        connectionStatus={
          isConfigurationLoading ? (
            <FormAgentConnectionStatusSkeleton />
          ) : (
            <FormAgentConnectionStatus
              isConnected={formAgent.isConnected}
              connectionState={formAgent.connectionState}
            />
          )
        }
        form={
          isConfigurationLoading ? (
            <CrawlerConfigurationSkeleton />
          ) : (
            <ConfigurationComponent
              tool={primaryTool}
              values={values}
              setValue={setValue}
              formError={formError}
              executionError={formAgent.error}
              isRunning={formAgent.isRunning}
              canExecute={canExecute}
              hasResultOrLogs={
                formAgent.logs.length > 0 ||
                formAgent.messages.length > 0
              }
              operationStatus={formAgent.status}
              cancelOperation={
                formAgent.cancelOperation
              }
              supportsBrowserSession={supportsBrowserSession}
              browserSession={
                supportsBrowserSession
                  ? browserSession
                  : null
              }
              onStartBrowserSession={handleStartBrowserSession}
              onCaptureBrowserSession={handleCaptureBrowserSession}
              onSubmit={handleSubmit}
              onReset={formAgent.reset}
            />
          )
        }
        result={
          isConfigurationLoading ? (
            <FormAgentResultSkeleton />
          ) : (
            <FormAgentResultPanel
              title="Result"
              emptyText="Configure the form and run the operation."
              runningText="The agent is processing the request."
              status={formAgent.status}
              isRunning={formAgent.isRunning}
              logs={formAgent.logs}
              messages={formAgent.messages}
              operation={formAgent.operation}
              uiComponents={primaryTool?.ui}
              agentType={agent.agentData?.role_name ?? ""}
            />
          )
        }
      />

      {showAgentDetails && (
        <AgentDetailsDialog
          agentData={agent.agentData}
          onClose={() => setShowAgentDetails(false)}
        />
      )}
    </>
  );
}

/**
 * Values as sent, not as displayed. A ready session is stamped on at submit
 * time rather than trusted from form state, so a run can never carry a stale
 * session id that expired while the form sat open.
 */
export function buildEffectiveSubmitValues({
  values,
  browserSessionSupported,
  browserSessionId,
}: {
  values: FormValues;
  browserSessionSupported: boolean;
  browserSessionId: string | null;
}): FormValues {
  if (!browserSessionSupported) {
    return values;
  }

  if (browserSessionId) {
    return { ...values, ...authenticatedSessionValues(browserSessionId) };
  }

  if (hasMeaningfulValue(values.auth_mode)) {
    return values;
  }

  return { ...values, ...anonymousSessionValues() };
}

function FormAgentConnectionStatus({
  isConnected,
  connectionState,
}: {
  isConnected: boolean;
  connectionState: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 text-sm">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isConnected ? "bg-green-500" : "bg-gray-400"
        }`}
      />

      <span>
        {isConnected
          ? "Form agent connected"
          : `Form agent connection: ${connectionState}`}
      </span>
    </div>
  );
}
