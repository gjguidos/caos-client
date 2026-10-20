"use client";

import { AgentFormValues } from "@/shared/lib/agent.types";
import { useAgentTypeRegistry } from "@/store/selectors";
import { labelForKey } from "@/store/slices/registry/registryEntry";
import type { SoulProfile } from "@/store/slices/registry/soulSlice";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { CognitiveModuleMap } from "@/app/agents/_api/fetch_cognitive_modules";
import { StructuredSoul } from "../../soul";
import BasicSection, { RulePackField } from "../BasicSection";
import CognitiveDefaults from "../CognitiveDefaults";
import PersonalitySection from "../PersonalitySection";
import SecuritySection, { Team } from "../SecuritySection";
import { StepHeading } from "../StepHeading";
import ToolsSection from "../ToolSection";
import { MENU_META, MenuSection } from "../wizardSteps";
import WorkflowsSection from "../WorkflowsSection";

export interface StepProps {
  form: UseFormReturn<AgentFormValues>;
  cognitiveModules: CognitiveModuleMap;
  toolRegs: ToolDefinition[];
  personalityRegs: SoulProfile[];
  soul: StructuredSoul | null;
  personalityLoading: boolean;
  groups: Team[];
  canEdit: boolean;
}

/**
 * Renders the section for the selected step. One switch, shared by the create
 * and edit routes, so the two cannot drift apart.
 */
export function WizardStep({
  selected,
  ...props
}: Readonly<StepProps & { selected: MenuSection }>) {
  const meta = MENU_META[selected];

  return (
    <>
      <StepHeading title={meta.title} blurb={meta.blurb} />
      {selected === MenuSection.Identity && <IdentityStep {...props} />}
      {selected === MenuSection.Capabilities && <CapabilitiesStep {...props} />}
      {selected === MenuSection.Behaviour && <BehaviourStep {...props} />}
      {selected === MenuSection.Access && <AccessStep {...props} />}
    </>
  );
}

function IdentityStep({ form, cognitiveModules }: Readonly<StepProps>) {
  const agentTypeRegs = useAgentTypeRegistry();
  const type = useWatch({ control: form.control, name: "type" });
  const typeLabel = labelForKey(agentTypeRegs, type) || "this agent type";

  return (
    <div className="space-y-4">
      <BasicSection form={form} />
      <CognitiveDefaults
        form={form}
        cognitiveModules={cognitiveModules}
        typeLabel={typeLabel}
      />
    </div>
  );
}

function CapabilitiesStep({ form, toolRegs }: Readonly<StepProps>) {
  return (
    <div>
      <ToolsSection form={form} toolRegs={toolRegs} />
      {/* A rule, not just space: workflows are a second decision on this
          screen, not the tail of the tools list. */}
      <div className="mt-8 border-t border-neutral-3 pt-8">
        <WorkflowsSection form={form} />
      </div>
    </div>
  );
}

function BehaviourStep({
  form,
  personalityRegs,
  soul,
  personalityLoading,
}: Readonly<StepProps>) {
  return (
    <div className="space-y-4">
      <PersonalitySection
        form={form}
        personalityRegs={personalityRegs}
        soul={soul}
        loading={personalityLoading}
      />
      <div className="agent-wizard-card">
        <RulePackField form={form} />
      </div>
    </div>
  );
}

function AccessStep({ form, groups, canEdit }: Readonly<StepProps>) {
  return <SecuritySection form={form} groups={groups} canEdit={canEdit} />;
}
