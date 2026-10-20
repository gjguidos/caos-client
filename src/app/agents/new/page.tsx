"use client";

import {
  fetchCognitiveModules,
  type CognitiveModuleMap,
} from "@/app/agents/_api/fetch_cognitive_modules";
import { BuilderAccessGate } from "@/shared/components/BuilderAccessGate/BuilderAccessGate";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { useToast } from "@/shared/hooks/useToast";
import {
  AgentFormValues,
  COGNITIVE_MODULE_KEYS,
} from "@/shared/lib/agent.types";
import { useSoulRegistry, useToolRegistry } from "@/store/selectors";
import { useReturnTo } from "@/shared/lib/navigation/returnTo";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  agentFormDefaults,
  DEFAULT_AGENT_TYPE_KEY,
  useAdminGroups,
  WizardLoading,
} from "../_components/CreateAgentForm/agentForm";
import AgentWizard from "../_components/CreateAgentForm/AgentWizard";
import DetailsChatPanel from "../_components/CreateAgentForm/sections/DetailsChatPanel";
import { usePersonalitySoul } from "../_components/CreateAgentForm/usePersonalitySoul";
import ServerMessagesDialog from "../_components/dialogs/ServerMessagesDialog";
import { useAgentCreation } from "../_hooks/useAgentCreation";

type FormValues = AgentFormValues;

export default function CreateAgentPage() {
  return (
    <Suspense fallback={<WizardLoading label="Loading..." />}>
      <CreateAgent />
    </Suspense>
  );
}

function CreateAgent() {
  // Use authentication hook to get user ID and team admin roles
  const { userId, canCreateAgent, adminGroupIds } = useAuth();
  const { showError } = useToast();
  const router = useRouter();
  const returnTo = useReturnTo("/");

  const form = useForm<FormValues>({
    defaultValues: agentFormDefaults,
  });

  const soulRegs = useSoulRegistry();
  const toolRegs = useToolRegistry();

  const { soul: personalitySoul, loading: personalityLoading } =
    usePersonalitySoul(form);

  const [cognitiveModules, setCognitiveModules] = useState<CognitiveModuleMap>(
    {}
  );

  const [isLoading, setIsLoading] = useState(true);

  // Derive admin teams directly from JWT role claims
  const groups = useAdminGroups(adminGroupIds);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const modules = await fetchCognitiveModules();

        COGNITIVE_MODULE_KEYS.forEach((key) => {
          const desc = modules[key];
          if (desc)
            form.setValue(`cognitive_modules.${key}`, desc.default ?? "");
        });

        setCognitiveModules(modules);
      } catch (err) {
        console.error("Failed to load registries or cognitive modules", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [form]);

  // Agent creation socket + lifecycle (connection, live logs, terminal phase)
  const {
    logs,
    agentDetail,
    phase: createPhase,
    creatingName,
    message: createMessage,
    connectionState,
    isConnected,
    create,
    resetToEditing,
  } = useAgentCreation();

  // UI state
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [chatTab, setChatTab] = useState<"details" | "chat">("details");

  const handleCreate = useCallback(() => {
    if (!isConnected) {
      const description =
        connectionState === "connecting" || connectionState === "reconnecting"
          ? "WebSocket is still connecting. Please wait a moment and try again."
          : connectionState === "error"
            ? "WebSocket connection error. Please refresh the page."
            : "WebSocket connection is not ready";

      showError("WebSocket connection is not ready", { description });
      return;
    }

    const vals = form.getValues();

    // Ensure user is authenticated before creating agent
    if (!userId) {
      showError("Authentication required", {
        description: "Please sign in to create an agent",
      });
      return;
    }

    if (!canCreateAgent) {
      showError("Insufficient permissions", {
        description:
          "You need a group admin role or superadmin to create agents",
      });
      return;
    }

    const visibility = vals.security?.visibility || "public";
    const whitelistedGroups = vals.security?.whitelisted_groups || [];
    const rulePackIds = vals.rulepackRegistry ? [vals.rulepackRegistry] : [];

    const msg = {
      event: "joshu-a.create",
      data: {
        message: {
          user_id: userId,
          name: vals.name,
          type: vals.type || DEFAULT_AGENT_TYPE_KEY,
          role_name: vals.roleRegistry,
          role: {
            name: vals.roleRegistry,
            version: "1.0.0", // or undefined / dynamic if you want
            config: {}, // leave empty for now, can be extended later
            rule_packs: rulePackIds, // ["green_claims_compliance"]
            rule_overrides: null, // reserved for per-agent tweaks
          },

          llm_type: vals.cognitive_modules.llm,
          image_type: vals.cognitive_modules.image,
          video_type: vals.cognitive_modules.video,
          audio_type: vals.cognitive_modules.audio,
          db_type: vals.cognitive_modules.db,
          cache_type: vals.cognitive_modules.cache,
          communication: vals.cognitive_modules.communication,
          knowledge_db_type: vals.cognitive_modules.knowledge_db,
          embedding_type: vals.cognitive_modules.embedding,
          messaging_type: vals.cognitive_modules.messaging,
          personality_key: vals.personalityRegistry || undefined,
          visibility,
          whitelisted_groups: whitelistedGroups,
          tools: vals.tools,
          workflows: vals.workflows,
          prompt: vals.prompt,
        },
      },
    };

    // Start a fresh creation run and surface the live logs immediately
    setShowMessagesDialog(true);
    create(vals.name, msg);
  }, [
    form,
    isConnected,
    connectionState,
    userId,
    canCreateAgent,
    create,
    showError,
  ]);

  if (isLoading) {
    return <WizardLoading label="Loading session..." />;
  }

  const connectionLabel =
    connectionState === "connected"
      ? "Connected"
      : connectionState === "connecting"
        ? "Connecting…"
        : connectionState === "reconnecting"
          ? "Reconnecting…"
          : connectionState === "error"
            ? "Connection error"
            : "Disconnected";

  return (
    <BuilderAccessGate
      resource="agents"
      backHref={returnTo}
      backLabel="Back to agents"
    >
      <AgentWizard
        title="Create agent"
        backHref={returnTo}
        breadcrumb="Back to agents"
        form={form}
        cognitiveModules={cognitiveModules}
        toolRegs={toolRegs}
        personalityRegs={soulRegs}
        soul={personalitySoul}
        personalityLoading={personalityLoading}
        groups={groups}
        canEdit={canCreateAgent}
        onSubmit={handleCreate}
        submitLabel="Create agent"
        footnote="You can edit everything after creating."
        connection={{ ok: isConnected, label: connectionLabel }}
        onViewLogs={() => setShowMessagesDialog(true)}
        summarySlot={
          agentDetail ? (
            <div className="p-6">
              <DetailsChatPanel
                detail={agentDetail}
                tab={chatTab}
                onTabChange={setChatTab}
              />
            </div>
          ) : undefined
        }
      />

      <ServerMessagesDialog
        open={showMessagesDialog}
        onClose={() => setShowMessagesDialog(false)}
        logs={logs}
        phase={createPhase}
        agentName={creatingName}
        message={createMessage}
        onDone={() => router.push(returnTo)}
        onBackToEditing={() => {
          setShowMessagesDialog(false);
          resetToEditing();
        }}
      />
    </BuilderAccessGate>
  );
}
