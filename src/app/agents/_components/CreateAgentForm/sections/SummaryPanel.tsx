
"use client";

import { useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { useWorkflowCatalog } from "@/shared/hooks/useWorkflowCatalog";
import type {
  AgentFormValues,
  CognitiveModuleKey,
} from "@/shared/lib/agent.types";
import { humanizeKey } from "@/shared/lib/humanizeKey";
import { resolveAttachedWorkflows } from "@/shared/lib/workflow/attachedWorkflows";

import {
  useAgentTypeRegistry,
  useRoleRegistry,
  useRulePackRegistry,
  useSoulRegistry,
} from "@/store/selectors";

import {
  findByKey,
  labelForKey,
} from "@/store/slices/registry/registryEntry";

import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";

import type {
  CognitiveModuleMap,
  ModuleDesc,
} from "@/app/agents/_api/fetch_cognitive_modules";

import RulePackPreviewDialog from "../../dialogs/RulePackDialog";
import SoulInspectorDialog from "../../dialogs/SoulInspectorDialog";

import {
  type Gap,
  provenanceOf,
} from "../draftStatus";

import type { StructuredSoul } from "../soul";
import type { Team as Group } from "./SecuritySection";

import { SpecGroup, SpecRow } from "./SpecRow";
import { SubmitButton } from "./SubmitAction";

type FormValues = AgentFormValues;

interface SummaryProps {
  form: UseFormReturn<FormValues>;
  onSubmit: () => void;

  toolRegs?: ToolDefinition[];
  groups?: Group[];
  cognitiveModules?: CognitiveModuleMap;

  /** Outstanding required fields. */
  gaps?: Gap[];

  /** Navigate to a gap's step and focus its field. */
  onGoToGap?: (gap: Gap) => void;

  submitting?: boolean;
  busyReason?: string;
  submitLabel?: string;

  /** Create-only informational footnote. */
  footnote?: string;

  soul: StructuredSoul | null;
}

/**
 * Agent specification sheet.
 *
 * Shows what has been configured, which values
 * were selected explicitly, and which values
 * are inherited or still missing.
 *
 * The summary is derived from the live form,
 * not from the currently selected wizard step.
 */
export default function SummaryPanel({
  form,
  onSubmit,
  toolRegs = [],
  groups = [],
  cognitiveModules = {},
  gaps = [],
  onGoToGap,
  submitting = false,
  busyReason,
  submitLabel = "Create agent",
  footnote,
  soul,
}: SummaryProps) {
  const [personaDialogOpen, setPersonaDialogOpen] =
    useState(false);

  const [rulepackDialogOpen, setRulepackDialogOpen] =
    useState(false);

  const rulePackRegs = useRulePackRegistry();
  const agentTypeRegs = useAgentTypeRegistry();
  const roleRegs = useRoleRegistry();
  const soulRegs = useSoulRegistry();

  const values = useWatch({
    control: form.control,
  }) as FormValues;

  const {
    name,
    type,
    roleRegistry,
    rulepackRegistry,
    personalityRegistry,
    security,
    tools = [],
    workflows = [],
  } = values ?? ({} as FormValues);

  // Resolve workflow keys to their catalog names,
  // retaining stale entries for visibility.
  const workflowCatalog = useWorkflowCatalog();

  const attachedWorkflows = resolveAttachedWorkflows(
    workflows ?? [],
    workflowCatalog
  );

  const groupLookup = useMemo(() => {
    const lookup = new Map<string, Group>();

    groups.forEach((group) => {
      lookup.set(group.group_id, group);
    });

    return lookup;
  }, [groups]);

  const allowedGroups = (
    security?.whitelisted_groups ?? []
  ).map((id) => groupLookup.get(id)?.name ?? id);

  const visibility = security?.visibility ?? "public";
  const isPrivate = visibility === "private";

  const selectedRulePack = findByKey(
    rulePackRegs,
    rulepackRegistry
  );

  // Registry keys are displayed as human-readable labels.
  const typeLabel = labelForKey(agentTypeRegs, type);
  const roleLabel = labelForKey(roleRegs, roleRegistry);
  const rulepackLabel = labelForKey(
    rulePackRegs,
    rulepackRegistry
  );

  const personaName = labelForKey(
    soulRegs,
    personalityRegistry
  );

  const moduleEntries = Object.entries(
    cognitiveModules
  ) as [CognitiveModuleKey, ModuleDesc][];

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-card">
        {/* Header */}
        <header className="shrink-0 border-b border-border px-6 pb-5 pt-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Spec
          </p>

          <h2
            className="truncate text-base font-semibold text-foreground"
            title={name?.trim() || "Untitled agent"}
          >
            {name?.trim() || "Untitled agent"}
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {typeLabel
              ? `${typeLabel} agent`
              : "No type chosen"}

            {roleLabel ? ` · ${roleLabel}` : ""}
          </p>
        </header>

        {/* Scrollable specification */}
        <div className="agent-wizard-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <SpecGroup title="IDENTITY">
            <SpecRow
              label="Name"
              value={name?.trim() || "Not set"}
              provenance={provenanceOf(name)}
            />

            <SpecRow
              label="Type"
              value={typeLabel || "Not set"}
              provenance={provenanceOf(type)}
            />

            <SpecRow
              label="Role"
              value={roleLabel || "Not set"}
              provenance={provenanceOf(roleRegistry)}
            />
          </SpecGroup>

          <SpecGroup title="BEHAVIOUR">
            <SpecRow
              label="Personality"
              value={personaName || "None"}
              provenance={provenanceOf(
                personalityRegistry
              )}
              onActivate={
                personalityRegistry
                  ? () => setPersonaDialogOpen(true)
                  : undefined
              }
            />

            <SpecRow
              label="Rule pack"
              value={rulepackLabel || "None"}
              provenance={provenanceOf(
                rulepackRegistry
              )}
              onActivate={
                rulepackRegistry
                  ? () => setRulepackDialogOpen(true)
                  : undefined
              }
            />
          </SpecGroup>

          <SpecGroup title="CAPABILITIES">
            <SpecRow
              label="Tools"
              value={
                tools.length
                  ? `${tools.length} enabled`
                  : "None"
              }
              provenance={
                tools.length ? "set" : "empty"
              }
            />

            {tools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-2 pl-3">
                {tools.map((tool) => (
                  <Badge
                    key={tool.key}
                    variant="secondary"
                    className="max-w-full rounded-full px-2.5 py-1 text-xs font-normal"
                  >
                    <span className="truncate">
                      {toolRegs.find(
                        (registryTool) =>
                          registryTool.key === tool.key
                      )?.name ?? tool.key}
                    </span>
                  </Badge>
                ))}
              </div>
            )}

            <SpecRow
              label="Workflows"
              value={
                attachedWorkflows.length
                  ? `${attachedWorkflows.length} attached`
                  : "None"
              }
              provenance={
                attachedWorkflows.length
                  ? "set"
                  : "empty"
              }
            />

            {attachedWorkflows.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-2 pl-3">
                {attachedWorkflows.map((workflow) => (
                  <Badge
                    key={workflow.key}
                    variant={
                      workflow.stale
                        ? "outline"
                        : "secondary"
                    }
                    className={cn(
                      "max-w-full rounded-full px-2.5 py-1 text-xs font-normal",
                      workflow.stale &&
                        "border-amber-500/40 bg-amber-500/10 font-mono text-amber-700 dark:text-amber-400"
                    )}
                  >
                    <span className="truncate">
                      {workflow.name}
                      {workflow.stale &&
                        " · not in catalog"}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </SpecGroup>

          {moduleEntries.length > 0 && (
            <SpecGroup title="COGNITIVE">
              {moduleEntries.map(([key, description]) => {
                const value =
                  values?.cognitive_modules?.[key] ?? "";

                return (
                  <SpecRow
                    key={key}
                    label={humanizeKey(key)}
                    value={value || "None"}
                    provenance={provenanceOf(
                      value,
                      description.default
                    )}
                    mono={Boolean(value)}
                  />
                );
              })}
            </SpecGroup>
          )}

          <SpecGroup title="ACCESS">
            <SpecRow
              label="Visibility"
              value={isPrivate ? "Private" : "Public"}
              provenance="set"
            />

            {isPrivate && (
              <SpecRow
                label="Allowed groups"
                value={
                  allowedGroups.length
                    ? allowedGroups.join(", ")
                    : "None"
                }
                provenance={
                  allowedGroups.length
                    ? "set"
                    : "empty"
                }
              />
            )}
          </SpecGroup>
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-border px-6 pb-5 pt-4">
          {gaps.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Before you create
              </h3>

              {/* Keep long gap lists scrollable so they
                  do not consume the entire spec panel. */}
              <ul className="agent-wizard-scroll flex max-h-[26vh] flex-col gap-0.5 overflow-y-auto">
                {gaps.map((gap) => (
                  <li key={gap.field}>
                    <button
                      type="button"
                      onClick={() => onGoToGap?.(gap)}
                      disabled={!onGoToGap}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left",
                        "text-xs text-foreground/80",
                        "transition-colors hover:bg-muted",
                        "focus-visible:outline-none",
                        "focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-default disabled:hover:bg-transparent"
                      )}
                    >
                      <ArrowRight
                        className="mt-0.5 size-3.5 shrink-0 text-destructive"
                        aria-hidden="true"
                      />

                      <span>{gap.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SubmitButton
            gaps={gaps}
            onSubmit={onSubmit}
            label={submitLabel}
            submitting={submitting}
            busyReason={busyReason}
            fluid
          />

          {footnote && gaps.length === 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {footnote}
            </p>
          )}
        </footer>
      </div>

      {/* Personality preview */}
      <SoulInspectorDialog
        open={personaDialogOpen}
        onClose={() => setPersonaDialogOpen(false)}
        soul={soul}
      />

      {/* Rule pack preview */}
      <RulePackPreviewDialog
        open={rulepackDialogOpen}
        onClose={() => setRulepackDialogOpen(false)}
        rulepackName={rulepackLabel}
        details={selectedRulePack ?? undefined}
        isLoading={false}
        error={
          selectedRulePack
            ? null
            : rulepackRegistry
              ? "Rule pack not found"
              : null
        }
      />
    </>
  );
}
