"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DynamicFormRenderer } from "@/app/(workspace)/_tool-form/DynamicFormRenderer";
import { ControlledToolPropertiesForm } from "@/app/(workspace)/_tool-form/ToolPropertiesForm";
import { inputFieldToUIComponent } from "@/app/(workspace)/orchestration/_lib/parseWorkflowDefinition";
import type {
  FormValue,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { formErrors } from "@/app/(workspace)/_tool-form/validateField";
import AgentWizardShell from "@/app/agents/_components/CreateAgentForm/AgentWizardShell";
import SummaryPanel from "@/app/agents/_components/CreateAgentForm/sections/SummaryPanel";
import { useDraftStatus } from "@/app/agents/_components/CreateAgentForm/useDraftStatus";
import { MenuSection } from "@/app/agents/_components/CreateAgentForm/sections/wizardSteps";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import type { WorkflowInputField } from "@/shared/lib/workflow/workflow.types";
import { useWorkflowCatalog } from "@/shared/hooks/useWorkflowCatalog";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import {
  useAgentTypeRegistry,
  useRoleRegistry,
  useSoulRegistry,
  useToolRegistry,
  useRulePackRegistry,
} from "@/store/selectors";
import type { ToolDefinition } from "@/store/slices/registry/toolsSlice";
import { CreationReviewPanel } from "./CreationReviewPanel";
import { DraftProposalsPanel } from "./DraftProposalsPanel";
import { ServerDraftBar } from "./ServerDraftBar";
import { useCreationReview } from "./useCreationReview";
import { useServerDraft } from "./useServerDraft";
import {
  creationDraftSchema,
  creationFromForm,
  draftPaths,
  DRAFT_CONTRACT,
  requiredDraftGaps,
  type Presentation,
} from "@/shared/lib/enki/draft";
import { serverDraftSchema } from "@/shared/lib/enki/serverDraft";

/** Only admin configuration fields, never invocation fields or action widgets. */
export function toolConfigurationFields(
  ui: unknown,
  schema?: ToolDefinition["agent_config_schema"]
): UIComponent[] {
  const fields =
    (
      ui as
        | {
            admin?: {
              fields?: Record<
                string,
                Omit<WorkflowInputField, "input"> & { input: string }
              >;
            };
          }
        | undefined
    )?.admin?.fields ?? {};
  const properties =
    typeof schema === "object"
      ? (schema.properties as
          | Record<string, Record<string, unknown>>
          | undefined)
      : undefined;
  const required =
    typeof schema === "object" && Array.isArray(schema.required)
      ? schema.required
      : [];
  return Object.entries(fields).flatMap(([key, field], index) => {
    // Files/actions could perform effects from a draft and are deliberately unavailable.
    if (
      ![
        "text",
        "textarea",
        "number",
        "number_or_null",
        "select",
        "multiselect",
        "object",
        "boolean",
        "switch",
      ].includes(field.input)
    )
      return [];
    const property = properties?.[key];
    const component = inputFieldToUIComponent(
      {
        ...field,
        required: required.includes(key) || field.required,
        constraints: {
          ...field.constraints,
          ...(typeof property?.minimum === "number"
            ? { min: property.minimum }
            : {}),
          ...(typeof property?.maximum === "number"
            ? { max: property.maximum }
            : {}),
        },
        options: field.options?.map((option) => ({ ...option })),
        key,
        input: field.input === "number_or_null" ? "number" : field.input,
      },
      index,
      undefined
    );
    return [
      {
        ...component,
        ...(["boolean", "switch"].includes(field.input)
          ? { type: "boolean" as const, widget: "SwitchField" as const }
          : {}),
        group: "configuration",
        render_paths: ["propertiesPanel.configuration"],
      },
    ];
  });
}

// Disables every rendered field while a server draft is frozen or consumed.
const READ_ONLY = "__draft_read_only";

export function DraftWorkspace({
  agentId,
  name,
  presentation,
  canConverse = false,
  persistence = "local",
}: {
  agentId: string;
  name: string;
  presentation: Presentation;
  canConverse?: boolean;
  /** ``server``: one durable, revisioned draft (DRAFT-0.2B); ``local``: this page only. */
  persistence?: "local" | "server";
}) {
  const [selected, setSelected] = useState(MenuSection.Identity);
  const form = useForm<AgentFormValues>({
    defaultValues: {
      name: "",
      type: "",
      roleRegistry: "",
      personalityRegistry: "",
      prompt: "",
      tools: [],
      workflows: [],
      security: { visibility: "private", whitelisted_groups: [] },
      rulepackRegistry: "",
      rulePackIds: [],
      guiComponents: "",
      cognitive_modules: {} as AgentFormValues["cognitive_modules"],
    },
  });
  const values = useWatch({ control: form.control }) as AgentFormValues;
  const creation = creationFromForm(values);
  const draft = {
    contract: DRAFT_CONTRACT,
    schema_version: 1,
    resource_type: "agent",
    creation,
  };
  const serverDraft = useServerDraft(agentId, form, {
    enabled: persistence === "server",
  });
  const saved = serverDraft.phase === "ready" ? serverDraft.draft : undefined;
  const readOnly = serverDraft.readOnly;
  const serverReview = useCreationReview(
    agentId,
    draft,
    Date.now,
    saved
      ? {
          draftsUrl: `/api/caos/v2/agents/${encodeURIComponent(agentId)}/drafts`,
          draftId: saved.draft_id,
          revision:
            saved.status === "editing"
              ? saved.revision
              : (saved.lifecycle?.reviewed_revision ?? saved.revision),
          dirty: serverDraft.dirty.length > 0,
          approved:
            saved.status === "approved" &&
            saved.lifecycle?.approval_id &&
            saved.lifecycle.review_digest
              ? {
                  approval_id: saved.lifecycle.approval_id,
                  review_digest: saved.lifecycle.review_digest,
                }
              : undefined,
          onDraft: (next) => {
            const parsed = serverDraftSchema.safeParse(next);
            if (parsed.success) serverDraft.adopt(parsed.data);
          },
          onCreated: () => void serverDraft.refresh(),
        }
      : undefined
  );
  const resolveGaps = useCallback(
    (draft: AgentFormValues) => requiredDraftGaps(draft, presentation),
    [presentation]
  );
  const status = useDraftStatus(form, {}, selected, setSelected, resolveGaps);
  const types = useAgentTypeRegistry();
  const roles = useRoleRegistry();
  const souls = useSoulRegistry();
  const tools = useToolRegistry();
  const packs = useRulePackRegistry();
  const workflows = useWorkflowCatalog();
  const { userGroupIds, adminGroupIds } = useAuth();
  const requesterGroups = [...new Set([...userGroupIds, ...adminGroupIds])];
  const registries: Record<
    string,
    ReadonlyArray<{ key: string; name: string }>
  > = {
    agent: types,
    role: roles,
    personality: souls,
    tool: tools,
    rulepack: packs,
    workflow: workflows.status === "ready" ? workflows.entries : [],
  };
  const fields = presentation.inputs.map((field) => {
    const entries =
      field.source?.kind === "requester_groups"
        ? requesterGroups.map((key) => ({ key, name: key }))
        : registries[field.source?.registry ?? ""];
    return {
      ...field,
      options: entries
        ? entries.map((item) => ({ value: item.key, label: item.name }))
        : field.options,
    };
  });
  const issues: string[] = [];
  const parsed = creationDraftSchema.safeParse({
    contract: DRAFT_CONTRACT,
    schema_version: 1,
    resource_type: "agent",
    creation,
  });
  if (!parsed.success)
    issues.push(
      ...parsed.error.issues.map(
        (issue) => `${issue.path.slice(1).join(".")}: ${issue.message}`
      )
    );
  for (const field of fields) {
    if (!field.source) continue;
    if (field.key === "workflows" && workflows.status !== "ready") {
      issues.push(
        `workflows: catalog ${workflows.status}; references not verified`
      );
      continue;
    }
    const raw = creation[field.key];
    const keys =
      field.key === "tools"
        ? values.tools.map((tool) => tool.key)
        : Array.isArray(raw)
          ? raw
          : [raw];
    for (const key of keys)
      if (key && !field.options?.some((option) => option.value === key))
        issues.push(
          `${field.label}: selection unavailable in requester catalog (${key})`
        );
  }
  const role =
    roles.find((entry) => entry.key === values.roleRegistry)?.metadata ?? {};
  const type = types.find((entry) => entry.key === values.type)?.metadata ?? {};
  for (const key of ["agent_group", "agent_subclass"]) {
    if (role[key] && type[key] && role[key] !== type[key])
      issues.push(`Role is incompatible with Agent type (${key})`);
  }
  const caps = role.capabilities as
    | { required_tools?: Record<string, unknown> | string[] }
    | undefined;
  for (const key of Array.isArray(caps?.required_tools)
    ? caps.required_tools
    : Object.keys(caps?.required_tools ?? {})) {
    if (!values.tools.some((tool) => tool.key === key))
      issues.push(`Role requires Tool: ${key}`);
  }
  for (const tool of values.tools) {
    const definition = tools.find((entry) => entry.key === tool.key);
    const requiredPacks =
      definition?.required_rulepacks ??
      definition?.metadata?.required_rulepacks;
    const minimum = requiredPacks
      ? Math.max(
          1,
          Number(
            definition?.min_rulepacks ??
              definition?.metadata?.min_rulepacks ??
              1
          ) || 1
        )
      : 0;
    if ((values.rulePackIds?.length ?? 0) < minimum)
      issues.push(`${tool.key}: requires at least ${minimum} RulePack(s)`);
    for (const [field, error] of Object.entries(
      formErrors(
        toolConfigurationFields(
          definition?.ui,
          definition?.agent_config_schema
        ),
        tool.config as FormValues
      )
    ))
      issues.push(`${tool.key}.${field}: ${error}`);
    for (const component of toolConfigurationFields(
      definition?.ui,
      definition?.agent_config_schema
    )) {
      if (
        component.widget === "JsonField" &&
        typeof tool.config[component.id] === "string"
      ) {
        issues.push(
          `${tool.key}.${component.id}: configuration must contain valid JSON`
        );
      }
    }
  }
  const review = (
    <section aria-label="Configuration Summary" className="space-y-3 py-4">
      <h2 className="text-lg font-semibold">Configuration Summary</h2>
      <p className="text-sm text-muted-foreground">
        Local checks are advisory; the server review below is authoritative.
        Registry visibility is not invocation permission. Approval records a
        decision; creation is separately authorized by the server.
      </p>
      <ul aria-label="Validation feedback" className="text-sm text-destructive">
        {[...new Set(issues)].map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(draft, null, 2)}
      </pre>
      {saved && <DraftProposalsPanel state={serverDraft} />}
      {saved?.status === "consumed" ? (
        <p className="text-sm text-muted-foreground">
          This draft already created an Agent; review and creation are closed.
        </p>
      ) : (
        <CreationReviewPanel state={serverReview} />
      )}
    </section>
  );

  const components = fields
    .filter((field) => field.section === selected)
    .map((field, index) => {
      const component = inputFieldToUIComponent(field, index, undefined);
      return {
        ...component,
        group: selected,
        ...(readOnly
          ? {
              disabled_when: [
                {
                  field: READ_ONLY,
                  operator: "equals" as const,
                  value: true,
                  message:
                    saved?.status === "consumed"
                      ? "This draft created an Agent and is read-only."
                      : "Approved: reopen editing to change this draft.",
                },
              ],
            }
          : {}),
      };
    });
  const displayed: FormValues = {
    ...creation,
    tools: values.tools.map((tool) => tool.key),
    gui_components: values.guiComponents ?? "",
    [READ_ONLY]: readOnly,
  } as FormValues;
  const agentHref = saved?.lifecycle?.agent_id
    ? `/v2/conversations?agent=${encodeURIComponent(saved.lifecycle.agent_id)}`
    : null;
  const change = (key: string, value: FormValue) => {
    if (readOnly) return;
    const path = draftPaths[key as keyof typeof draftPaths];
    if (!path) return;
    if (key === "tools") {
      const refs = (value as string[]).map(
        (toolKey) =>
          values.tools.find((ref) => ref.key === toolKey) ?? {
            key: toolKey,
            config: {},
          }
      );
      form.setValue("tools", refs, { shouldDirty: true });
    } else form.setValue(path, value as never, { shouldDirty: true });
  };
  return (
    <AgentWizardShell
      navigationMode="settings"
      title={`${name} · Agent configuration draft`}
      backHref="/"
      selected={selected}
      onSelect={setSelected}
      stepStatus={status.stepStatus}
      summary={
        <SummaryPanel
          form={form}
          soul={null}
          onSubmit={() => {}}
          toolRegs={tools}
          gaps={status.gaps}
          onGoToGap={status.goToGap}
          reviewOnly
          reviewContent={review}
        />
      }
    >
      <div className="space-y-5">
        {persistence === "server" ? (
          <ServerDraftBar state={serverDraft} agentHref={agentHref} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Draft v1 — editing and review only. Nothing is saved or submitted.
            Navigation retains this draft until you leave the page.
          </p>
        )}
        {canConverse && (
          <Link
            className="text-sm underline underline-offset-4"
            href={`/v2/conversations?agent=${encodeURIComponent(agentId)}`}
          >
            Open conversation
          </Link>
        )}
        <DynamicFormRenderer
          key={selected}
          uiComponents={components}
          groupLabelMap={{ [selected]: selected }}
          values={displayed}
          onChange={change}
          renderField={({ component, defaultField }) => (
            <div
              data-field={draftPaths[component.id as keyof typeof draftPaths]}
            >
              {defaultField}
            </div>
          )}
        />
        {selected === MenuSection.Capabilities &&
          values.tools.map((tool, index) => {
            const definition = tools.find((entry) => entry.key === tool.key);
            const configFields = toolConfigurationFields(
              definition?.ui,
              definition?.agent_config_schema
            );
            const configValues = Object.fromEntries(
              Object.entries(tool.config).map(([key, value]) => [
                key,
                value === null
                  ? undefined
                  : typeof value === "object" && !Array.isArray(value)
                    ? JSON.stringify(value, null, 2)
                    : value,
              ])
            ) as FormValues;
            return (
              <section
                key={tool.key}
                aria-label={`${definition?.name ?? tool.key} configuration`}
                className="space-y-3 rounded-md border border-border p-4"
              >
                <h2 className="font-semibold">
                  {definition?.name ?? tool.key} · Agent-specific configuration
                </h2>
                <ControlledToolPropertiesForm
                  idPrefix={`agent-tool-${tool.key}`}
                  uiComponents={configFields}
                  values={configValues}
                  onChange={(key, value) => {
                    if (readOnly) return;
                    let next: unknown = value;
                    if (
                      configFields.find((field) => field.id === key)?.widget ===
                        "JsonField" &&
                      typeof value === "string"
                    ) {
                      try {
                        next = JSON.parse(value);
                      } catch {
                        /* Keep invalid text visible for correction and local review. */
                      }
                    }
                    form.setValue(
                      `tools.${index}.config`,
                      { ...tool.config, [key]: next },
                      { shouldDirty: true }
                    );
                  }}
                />
                <pre className="overflow-auto text-xs">
                  {JSON.stringify(tool.config, null, 2)}
                </pre>
              </section>
            );
          })}
        {persistence !== "server" && (
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset draft
          </Button>
        )}
        <div className="lg:hidden">{review}</div>
      </div>
    </AgentWizardShell>
  );
}
