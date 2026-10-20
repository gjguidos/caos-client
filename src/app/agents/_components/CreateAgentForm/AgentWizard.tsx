"use client";

import type { CognitiveModuleMap } from "@/app/agents/_api/fetch_cognitive_modules";
import { Form } from "@/app/agents/_components/Form/Form";
import { useToast } from "@/shared/hooks/useToast";
import { AgentFormValues } from "@/shared/lib/agent.types";
import type { SoulProfile } from "@/store/slices/registry/soulSlice";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import { ReactNode, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ActiveGapProvider } from "./activeGap";
import AgentWizardShell from "./AgentWizardShell";
import type { Team } from "./sections/SecuritySection";
import { WizardStep } from "./sections/steps/WizardSteps";
import { GapShortcutButton, SubmitButton } from "./sections/SubmitAction";
import SummaryPanel from "./sections/SummaryPanel";
import { MenuSection } from "./sections/wizardSteps";
import type { StructuredSoul } from "./soul";
import { useDraftStatus } from "./useDraftStatus";

interface AgentWizardProps {
  title: string;
  backHref: string;
  breadcrumb: string;

  form: UseFormReturn<AgentFormValues>;
  cognitiveModules: CognitiveModuleMap;
  toolRegs: ToolDefinition[];
  personalityRegs: SoulProfile[];
  soul: StructuredSoul | null;
  personalityLoading: boolean;
  groups: Team[];
  canEdit: boolean;

  /** Called only once the draft has no gaps left. */
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  /** Why submit is unavailable while nothing is missing, e.g. "Saving...". */
  busyReason?: string;
  /** Reassurance under the submit button, e.g. "You can edit this later." */
  footnote?: string;

  /** Replaces the spec sheet, e.g. with live logs once creation has started. */
  summarySlot?: ReactNode;
  connection?: { ok: boolean; label: string };
  onViewLogs?: () => void;
}

/**
 * The agent wizard: rail, step body and spec sheet, wired to one draft status.
 *
 * Both routes render this. What differs between creating and editing is where
 * the form values come from and what submitting does - not the shape of the
 * screen - so everything else lives here rather than being kept in step across
 * two pages.
 */
export default function AgentWizard({
  title,
  backHref,
  breadcrumb,
  form,
  cognitiveModules,
  toolRegs,
  personalityRegs,
  soul,
  personalityLoading,
  groups,
  canEdit,
  onSubmit,
  submitLabel,
  submitting = false,
  busyReason,
  footnote,
  summarySlot,
  connection,
  onViewLogs,
}: Readonly<AgentWizardProps>) {
  const { showError } = useToast();
  const [selected, setSelected] = useState<MenuSection>(MenuSection.Identity);

  const { gaps, activeGap, stepStatus, goToGap, goToFirstGap } = useDraftStatus(
    form,
    cognitiveModules,
    selected,
    setSelected
  );

  // Both submit buttons are disabled while gaps remain, so this only catches
  // anything that reaches submit another way.
  const submit = () => {
    if (gaps.length > 0) {
      showError("Some required fields are still empty", {
        description: gaps.map((gap) => gap.message).join(". "),
      });
      return;
    }
    onSubmit();
  };

  return (
    <ActiveGapProvider gap={activeGap}>
      <AgentWizardShell
        title={title}
        backHref={backHref}
        breadcrumb={breadcrumb}
        selected={selected}
        onSelect={setSelected}
        stepStatus={stepStatus}
        connection={connection}
        onViewLogs={onViewLogs}
        submitAction={
          <>
            <GapShortcutButton gapCount={gaps.length} onClick={goToFirstGap} />
            <SubmitButton
              gaps={gaps}
              onSubmit={submit}
              label={submitLabel}
              submitting={submitting}
              busyReason={busyReason}
            />
          </>
        }
        summary={
          summarySlot ?? (
            <SummaryPanel
              form={form}
              onSubmit={submit}
              groups={groups}
              toolRegs={toolRegs}
              cognitiveModules={cognitiveModules}
              gaps={gaps}
              onGoToGap={goToGap}
              submitLabel={submitLabel}
              submitting={submitting}
              busyReason={busyReason}
              footnote={footnote}
              soul={soul}
            />
          )
        }
      >
        <Form {...form}>
          {/* Submitting is owned by the spec sheet. Without this, Enter in any
              field - or Skapa's search button - reloads the page. */}
          <form onSubmit={(e) => e.preventDefault()}>
            <WizardStep
              selected={selected}
              form={form}
              cognitiveModules={cognitiveModules}
              toolRegs={toolRegs}
              personalityRegs={personalityRegs}
              soul={soul}
              personalityLoading={personalityLoading}
              groups={groups}
              canEdit={canEdit}
            />
          </form>
        </Form>
      </AgentWizardShell>
    </ActiveGapProvider>
  );
}
