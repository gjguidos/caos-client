import { z } from "zod";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import type { Gap } from "@/app/agents/_components/CreateAgentForm/draftStatus";
import { MenuSection } from "@/app/agents/_components/CreateAgentForm/sections/wizardSteps";

// This is a local draft contract, NOT a UTU grant or server registry validation.
export const DRAFT_CONTRACT = "caos.agent_creation_draft";
export const DRAFT_VERSION = 1;
const reservedNames = new Set([
  "admin",
  "system",
  "root",
  "api",
  "null",
  "undefined",
  "test",
  "demo",
  "example",
  "default",
  "config",
  "settings",
]);
const nonBlank = z.string().trim().min(1, "Required");
const componentBase = {
  key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  version: z.literal(1).default(1),
  default: z.boolean().default(false),
};
const guiComponentSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...componentBase,
      type: z.literal("chat"),
      config: z.object({}).strict().default({}),
    })
    .strict(),
  z
    .object({
      ...componentBase,
      type: z.literal("form"),
      config: z
        .object({
          source: z.discriminatedUnion("kind", [
            z
              .object({
                kind: z.literal("contract"),
                contract: z.literal(DRAFT_CONTRACT),
                schema_version: z.literal(1),
              })
              .strict(),
            z
              .object({
                kind: z.literal("workflow"),
                key: nonBlank.max(128),
                version: nonBlank.max(64),
              })
              .strict(),
          ]),
        })
        .strict(),
    })
    .strict(),
]);
export const creationDraftSchema = z
  .object({
    contract: z.literal(DRAFT_CONTRACT),
    schema_version: z.literal(DRAFT_VERSION),
    resource_type: z.literal("agent"),
    creation: z
      .object({
        name: nonBlank
          .max(100)
          .regex(/^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9])?$/)
          .transform((value) => value.replace(/\s+/g, " "))
          .refine(
            (value) => !reservedNames.has(value.toLowerCase()),
            "Reserved system name"
          ),
        type: nonBlank,
        role_name: nonBlank,
        personality_key: nonBlank,
        prompt: nonBlank,
        visibility: z.enum(["private", "public"]).default("private"),
        whitelisted_groups: z.array(nonBlank).default([]),
        tools: z
          .array(
            z
              .object({
                key: nonBlank,
                config: z.record(z.unknown()).default({}),
              })
              .strict()
          )
          .default([]),
        workflows: z.array(nonBlank).default([]),
        rule_pack_ids: z.array(nonBlank).default([]),
        gui_components: z
          .array(guiComponentSchema)
          .max(8)
          .superRefine((components, ctx) => {
            if (
              new Set(components.map((component) => component.key)).size !==
                components.length ||
              (components.length > 0 &&
                components.filter((component) => component.default).length !==
                  1)
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "GUI keys must be unique with exactly one default component",
              });
            }
          })
          .optional(),
      })
      .strict(),
  })
  .strict();
export type CreationDraft = z.infer<typeof creationDraftSchema>;

export const initialDraftValues = {
  name: "",
  type: "chat",
  role_name: "",
  personality_key: "",
  prompt: "",
  visibility: "private",
};

const presentationFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  input: z.enum([
    "text",
    "textarea",
    "select",
    "multiselect",
    "object",
    "number",
  ]),
  required: z.boolean(),
  section: z.nativeEnum(MenuSection),
  options: z
    .array(z.object({ value: z.string(), label: z.string().optional() }))
    .nullable()
    .optional(),
  source: z
    .object({ kind: z.string(), registry: z.string().optional() })
    .nullable()
    .optional(),
  constraints: z.record(z.unknown()).nullable().optional(),
  default: z.unknown().optional(),
});
export const presentationSchema = z.object({
  contract: z.literal(DRAFT_CONTRACT),
  schema_version: z.literal(1),
  presentation_version: z.literal(1),
  inputs: z.array(presentationFieldSchema),
});
export type Presentation = z.infer<typeof presentationSchema>;

/** One RHF draft, with the existing editor's paths; no V1 transport payload. */
export const draftPaths = {
  name: "name",
  type: "type",
  role_name: "roleRegistry",
  personality_key: "personalityRegistry",
  prompt: "prompt",
  tools: "tools",
  workflows: "workflows",
  rule_pack_ids: "rulePackIds",
  visibility: "security.visibility",
  whitelisted_groups: "security.whitelisted_groups",
  gui_components: "guiComponents",
} as const;

export function creationFromForm(
  values: AgentFormValues
): Record<string, unknown> {
  let gui: unknown;
  if (values.guiComponents?.trim()) {
    try {
      gui = JSON.parse(values.guiComponents);
    } catch {
      gui = values.guiComponents;
    }
  }
  return {
    name: values.name,
    type: values.type,
    role_name: values.roleRegistry,
    personality_key: values.personalityRegistry,
    prompt: values.prompt,
    tools: values.tools,
    workflows: values.workflows,
    rule_pack_ids: values.rulePackIds ?? [],
    visibility: values.security.visibility,
    whitelisted_groups: values.security.whitelisted_groups,
    ...(gui !== undefined ? { gui_components: gui } : {}),
  };
}

export function requiredDraftGaps(
  values: AgentFormValues,
  presentation: Presentation
): Gap[] {
  const creation = creationFromForm(values);
  return presentation.inputs
    .filter(
      (field) =>
        field.required &&
        (creation[field.key] == null ||
          creation[field.key] === "" ||
          (typeof creation[field.key] === "string" &&
            !String(creation[field.key]).trim()))
    )
    .map((field) => ({
      step: field.section,
      field: draftPaths[field.key as keyof typeof draftPaths],
      label: field.label,
      message: `${field.label} is required`,
    }));
}

export const formAgentDescriptorSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[\w-]+$/),
  name: z.string().min(1),
  effective_gui_components: z
    .array(
      z.object({
        type: z.string(),
        key: z.string(),
        version: z.number(),
        default: z.boolean(),
        config: z
          .object({
            source: z
              .object({
                kind: z.string(),
                contract: z.string().optional(),
                schema_version: z.number().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      })
    )
    .default([]),
  form_presentations: z.record(z.unknown()).default({}),
});
