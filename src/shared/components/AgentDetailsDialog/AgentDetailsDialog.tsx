
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useWorkflowCatalog } from "@/shared/hooks/useWorkflowCatalog";
import type { AgentSummary } from "@/shared/lib/agent.types";
import { resolveAttachedWorkflows } from "@/shared/lib/workflow/attachedWorkflows";

import {
  useAgentTypeRegistry,
  useRoleRegistry,
  useRulePackRegistry,
  useSoul,
  useToolRegistry,
} from "@/store/selectors";

import {
  findByKey,
  labelForKey,
} from "@/store/slices/registry/registryEntry";

import type { RulePack } from "@/store/slices/registry/rulePackSlice";

import { AgentSummaryHeader } from "./AgentSummaryHeader";
import { ChipList } from "./ChipList";
import { listCognitiveModules } from "./cognitiveModules";
import {
  DefinitionList,
  type Definition,
} from "./DefinitionList";
import { DetailSection } from "./DetailSection";
import { RulePackSections } from "./RulePackSections";

interface AgentDetailsDialogProps {
  agentData: AgentSummary | null;
  onClose: () => void;
}

/**
 * Agent details dialog.
 *
 * The parent mounts this component only when the
 * dialog is requested.
 *
 * This keeps the workflow catalog subscription and
 * related registry resolution out of the page until
 * the user opens the agent details.
 */
export function AgentDetailsDialog({
  agentData,
  onClose,
}: Readonly<AgentDetailsDialogProps>) {
  const rulePackRegistry = useRulePackRegistry();
  const personality = useSoul(agentData?.personality_key);
  const toolRegistry = useToolRegistry();
  const roleRegistry = useRoleRegistry();
  const agentTypeRegistry = useAgentTypeRegistry();

  const workflowCatalog = useWorkflowCatalog();

  /**
   * Include every attached rule pack.
   *
   * An agent may have multiple rule packs, and all
   * of them are relevant to the effective agent rules.
   */
  const rulePacks = (
    agentData?.rule_pack_ids ?? []
  )
    .map((id) =>
      findByKey(rulePackRegistry, id)
    )
    .filter(
      (pack): pack is RulePack =>
        pack !== null
    );

  const workflows = resolveAttachedWorkflows(
    agentData?.workflows ?? [],
    workflowCatalog
  );

  const cognitiveModules =
    listCognitiveModules(agentData);

  const tools = agentData?.tools ?? [];

  const identity: Definition[] = [
    {
      label: "Type",
      value: labelForKey(
        agentTypeRegistry,
        agentData?.type
      ),
    },
    {
      label: "Role",
      value: labelForKey(
        roleRegistry,
        agentData?.role_name
      ),
    },
    {
      label: "Personality",
      value: personality?.name ?? "",
    },
  ].filter((item) =>
    item.value.trim()
  );

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        {agentData ? (
          <>
            {/* Accessible title supplied by the agent header. */}
            <DialogHeader className="sr-only">
              <DialogTitle>
                Agent details: {agentData.name}
              </DialogTitle>

              <DialogDescription>
                Configuration, capabilities, workflows,
                and rule packs for this agent.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="flex flex-col gap-6">
                <AgentSummaryHeader
                  name={agentData.name}
                  description={
                    personality?.description
                  }
                />

                {/* Identity and cognitive settings on the left,
                    tools and workflows on the right. */}
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-6">
                    <DetailSection
                      title="Identity"
                      items={identity}
                      empty="No type, role or personality set."
                    >
                      <DefinitionList
                        items={identity}
                      />
                    </DetailSection>

                    <DetailSection
                      title="Cognitive modules"
                      items={cognitiveModules}
                      empty="No cognitive modules configured."
                    >
                      <DefinitionList
                        items={cognitiveModules}
                      />
                    </DetailSection>
                  </div>

                  <div className="flex flex-col gap-6">
                    <DetailSection
                      title="Tools"
                      items={tools}
                      showCount
                      empty="No tools registered for this agent."
                    >
                      <ChipList
                        items={tools.map(
                          (tool) => ({
                            key: tool.key,
                            label: labelForKey(
                              toolRegistry,
                              tool.key
                            ),
                          })
                        )}
                      />
                    </DetailSection>

                    <DetailSection
                      title="Workflows"
                      items={workflows}
                      showCount
                      empty="No workflows attached to this agent."
                    >
                      <ChipList
                        items={workflows.map(
                          (workflow) => ({
                            key: workflow.key,
                            label: workflow.name,
                            note: workflow.stale
                              ? "not in catalog"
                              : undefined,
                          })
                        )}
                      />
                    </DetailSection>
                  </div>
                </div>

                <DetailSection
                  title="Rule packs"
                  items={rulePacks}
                  showCount
                  empty="No rule packs attached to this agent."
                >
                  <RulePackSections
                    rulePacks={rulePacks}
                  />
                </DetailSection>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>
                Agent details
              </DialogTitle>

              <DialogDescription>
                Loading agent info...
              </DialogDescription>
            </DialogHeader>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
