"use client";

import {
  fetchCognitiveModules,
  type CognitiveModuleMap,
} from "@/app/agents/_api/fetch_cognitive_modules";
import { Alert, AlertDescription } from "@/shared/components/Alert/Alert";
import { BuilderAccessGate } from "@/shared/components/BuilderAccessGate/BuilderAccessGate";
import { fetchAgentById } from "@/shared/api/fetch_agents";
import { updateAgent } from "@/shared/api/update_agent";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/shared/hooks/useToast";
import {
  AgentFormValues,
  AgentSummary,
  AgentUpdatePayload,
} from "@/shared/lib/agent.types";
import { useSoulRegistry, useToolRegistry } from "@/store/selectors";
import { useReturnTo } from "@/shared/lib/navigation/returnTo";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  agentFormDefaults,
  DEFAULT_AGENT_TYPE_KEY,
  useAdminGroups,
  WizardLoading,
} from "../../_components/CreateAgentForm/agentForm";
import AgentWizard from "../../_components/CreateAgentForm/AgentWizard";
import { usePersonalitySoul } from "../../_components/CreateAgentForm/usePersonalitySoul";

type FormValues = AgentFormValues;

export default function EditAgentPage() {
  return (
    <Suspense fallback={<WizardLoading label="Loading agent..." />}>
      <GatedEditAgent />
    </Suspense>
  );
}

/**
 * Owns `returnTo` for this route and gates on it. The gate wraps the editor so
 * an unauthorised visitor is turned away before the agent and the cognitive
 * registry are fetched.
 */
function GatedEditAgent() {
  // Editing is a detour from wherever you were, so Save lands you back there
  // rather than stranding you in a builder screen.
  const returnTo = useReturnTo("/");

  return (
    <BuilderAccessGate
      resource="agents"
      backHref={returnTo}
      backLabel="Back to agents"
    >
      <EditAgent returnTo={returnTo} />
    </BuilderAccessGate>
  );
}

function EditAgent({ returnTo }: Readonly<{ returnTo: string }>) {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { canCreateAgent, adminGroupIds } = useAuth();

  const [agentData, setAgentData] = useState<AgentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { showError, showInfo, showSuccess } = useToast();

  const [cognitiveModules, setCognitiveModules] = useState<CognitiveModuleMap>(
    {}
  );

  const soulRegs = useSoulRegistry();
  const toolRegs = useToolRegistry();

  const groups = useAdminGroups(adminGroupIds);

  const form = useForm<FormValues>({
    defaultValues: agentFormDefaults,
  });

  const { soul: personalitySoul, loading: personalityLoading } =
    usePersonalitySoul(form);

  // Fetch agent data and cognitive modules on mount
  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        const [agentRes, cogRes] = await Promise.all([
          fetchAgentById(agentId) as Promise<{
            success: boolean;
            data: AgentSummary;
          }>,
          fetchCognitiveModules(),
        ]);

        if (cancelled) return;

        if (!agentRes?.success || !agentRes.data) {
          setFetchError("Failed to load agent data");
          return;
        }

        const agent = agentRes.data;
        setAgentData(agent);
        setCognitiveModules(cogRes);

        // Pre-fill form with agent data
        form.reset({
          name: agent.name || "",
          type: agent.type ?? DEFAULT_AGENT_TYPE_KEY,
          prompt: agent.prompt || "",
          personalityRegistry: agent.personality_key ?? "",
          tools:
            agent.tools?.map((t) => ({
              key: t.key,
              config: t.config ?? {},
            })) || [],
          workflows: agent.workflows ?? [],
          security: {
            visibility: agent.visibility || "private",
            whitelisted_groups: agent.whitelisted_groups || [],
          },
          cognitive_modules: {
            llm: agent.llm_type || cogRes.llm?.default || "",
            image: agent.image_type || cogRes.image?.default || "",
            video: agent.video_type || cogRes.video?.default || "",
            audio: agent.audio_type || cogRes.audio?.default || "",
            db: agent.db_type || cogRes.db?.default || "",
            cache: agent.cache_type || cogRes.cache?.default || "",
            communication: cogRes.communication?.default || "",
            knowledge_db:
              agent.knowledge_db_type || cogRes.knowledge_db?.default || "",
            embedding: agent.embedding_type || cogRes.embedding?.default || "",
            messaging: agent.messaging_type || cogRes.messaging?.default || "",
          },
          roleRegistry: agent.role_name || "",
          rulepackRegistry: agent.rule_pack_ids?.[0] || "",
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load agent for editing", err);
          setFetchError("An error occurred while loading the agent");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentId, form]);

  const handleUpdate = useCallback(async () => {
    const vals = form.getValues();

    const payload: AgentUpdatePayload = {
      name: vals.name,
      type: vals.type || undefined,
      role_name: vals.roleRegistry || undefined,
      prompt: vals.prompt || undefined,
      rule_pack_ids: vals.rulepackRegistry
        ? [vals.rulepackRegistry]
        : undefined,
      personality_key: vals.personalityRegistry || undefined,
      tools: vals.tools.length > 0 ? vals.tools : [],
      // Always sent, including `[]`, so detaching every workflow reaches the
      // backend instead of being dropped as "unchanged".
      workflows: vals.workflows ?? [],
      llm_type: vals.cognitive_modules.llm || undefined,
      image_type: vals.cognitive_modules.image || undefined,
      video_type: vals.cognitive_modules.video || undefined,
      audio_type: vals.cognitive_modules.audio || undefined,
      db_type: vals.cognitive_modules.db || undefined,
      cache_type: vals.cognitive_modules.cache || undefined,
      knowledge_db_type: vals.cognitive_modules.knowledge_db || undefined,
      embedding_type: vals.cognitive_modules.embedding || undefined,
      messaging_type: vals.cognitive_modules.messaging || undefined,
      visibility: vals.security?.visibility || undefined,
      whitelisted_groups: vals.security?.whitelisted_groups?.length
        ? vals.security.whitelisted_groups
        : undefined,
    };

    // Remove undefined keys so we only send fields with defined values
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );

    setIsSaving(true);
    showInfo(`Updating agent "${vals.name}"...`);

    try {
      const result = await updateAgent(
        agentId,
        cleanPayload as AgentUpdatePayload
      );
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        !(result as any).success
      ) {
        throw new Error((result as any).message || "Update failed");
      }
      showSuccess(`Agent "${vals.name}" updated successfully`);
      router.push(returnTo);
    } catch (error) {
      console.error("Failed to update agent", error);
      showError("Failed to update agent", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  }, [form, agentId, router, returnTo, showError, showInfo, showSuccess]);

  if (isLoading) {
    return <WizardLoading label="Loading agent..." />;
  }

  if (fetchError || !agentData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-xl space-y-4 rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Failed to load agent</h1>
          <Alert variant="destructive">
            <AlertDescription>
              {fetchError || "Agent not found"}
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.push(returnTo)}>
            Back to agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AgentWizard
      title={`Edit ${agentData.name}`}
      backHref={returnTo}
      breadcrumb={
        returnTo === "/" ? "Back to agents" : `Back to ${agentData.name}`
      }
      form={form}
      cognitiveModules={cognitiveModules}
      toolRegs={toolRegs}
      personalityRegs={soulRegs}
      soul={personalitySoul}
      personalityLoading={personalityLoading}
      groups={groups}
      canEdit={canCreateAgent}
      onSubmit={handleUpdate}
      submitLabel={isSaving ? "Saving…" : "Save changes"}
      submitting={isSaving}
      busyReason={isSaving ? "Saving..." : undefined}
    />
  );
}
