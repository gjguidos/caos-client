import { z } from "zod";
import type { AgentFormValues } from "@/shared/lib/agent.types";
import { creationFromForm, DRAFT_CONTRACT } from "@/shared/lib/enki/draft";
import {
  approvalSchema,
  draftKey,
  reviewSchema,
} from "@/shared/lib/enki/review";

// Server-authoritative draft (DRAFT-0.1/0.2A/0.2B). The server owns identity, owner,
// revision, provenance and lifecycle; the browser holds only unsaved local edits.

export const DRAFT_FIELDS = [
  "name",
  "type",
  "role_name",
  "personality_key",
  "prompt",
  "visibility",
  "whitelisted_groups",
  "tools",
  "workflows",
  "rule_pack_ids",
  "gui_components",
] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

const digest = z.string().regex(/^[0-9a-f]{64}$/);
const never = z.literal(false);

export const serverDraftSchema = z.object({
  contract: z.literal("caos.agent_draft"),
  schema_version: z.literal(1),
  draft_id: z.string().min(1),
  source_agent_id: z.string(),
  revision: z.number().int().min(1),
  status: z.enum(["editing", "approved", "consumed"]),
  draft: z.object({
    contract: z.literal(DRAFT_CONTRACT),
    schema_version: z.literal(1),
    resource_type: z.literal("agent"),
    creation: z.record(z.unknown()),
  }),
  provenance: z.record(
    z.object({
      origin: z.enum(["user", "proposal"]),
      revision: z.number().int(),
      proposal_id: z.string().optional(),
    })
  ),
  content_digest: digest,
  lifecycle: z
    .object({
      approval_id: z.string().nullable(),
      review_digest: digest.nullable(),
      reviewed_revision: z.number().int().nullable(),
      creation_id: z.string().nullable(),
      agent_id: z.string().nullable(),
    })
    .nullable(),
  forked_from: z
    .object({ draft_id: z.string(), revision: z.number().int() })
    .nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  authorizes: z.object({
    review: never,
    approval: never,
    creation: never,
    activation: never,
  }),
});
export type ServerDraft = z.infer<typeof serverDraftSchema>;

export const draftPageSchema = z.object({
  contract: z.literal("caos.agent_draft_page"),
  items: z.array(serverDraftSchema),
  next_cursor: z.string().nullable(),
});

export const proposalSchema = z.object({
  contract: z.literal("caos.agent_draft_proposal"),
  proposal_id: z.string().min(1),
  draft_id: z.string(),
  origin: z.string(),
  proposer_agent_id: z.string(),
  base_revision: z.number().int(),
  changes: z.record(z.unknown()),
  remove: z.array(z.string()),
  rationale: z.string().nullable(),
  state: z.enum([
    "pending",
    "deciding",
    "accepted",
    "partially_accepted",
    "rejected",
    "expired",
  ]),
  fields: z.array(z.string()),
  current_revision: z.number().int().nullable(),
  conflicting_fields: z.array(z.string()),
  applicable_fields: z.array(z.string()),
  expires_at: z.string(),
  authorizes: z.object({
    review: never,
    approval: never,
    creation: never,
    activation: never,
  }),
});
export type DraftProposal = z.infer<typeof proposalSchema>;

export const proposalPageSchema = z.object({
  contract: z.literal("caos.agent_draft_proposal_page"),
  current_revision: z.number().int(),
  items: z.array(proposalSchema),
  next_cursor: z.string().nullable(),
});

export const revisionReviewSchema = reviewSchema.extend({
  draft_ref: z.object({
    draft_id: z.string(),
    revision: z.number().int(),
    content_digest: digest,
  }),
});

export const draftApprovalSchema = z.object({
  approval: approvalSchema.passthrough(),
  draft: serverDraftSchema,
});

export const proposalDecisionSchema = z.object({
  proposal: proposalSchema,
  draft: serverDraftSchema,
});

const EMPTY_FORM: AgentFormValues = {
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
};

/** Server content → the existing editor's values (absent fields take form defaults). */
export function formFromCreation(
  creation: Record<string, unknown>
): AgentFormValues {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const list = <T>(value: unknown): T[] =>
    Array.isArray(value) ? (value as T[]) : [];
  return {
    ...EMPTY_FORM,
    name: text(creation.name),
    type: text(creation.type),
    roleRegistry: text(creation.role_name),
    personalityRegistry: text(creation.personality_key),
    prompt: text(creation.prompt),
    tools: list<AgentFormValues["tools"][number]>(creation.tools),
    workflows: list<string>(creation.workflows),
    rulePackIds: list<string>(creation.rule_pack_ids),
    security: {
      visibility: creation.visibility === "public" ? "public" : "private",
      whitelisted_groups: list<string>(creation.whitelisted_groups),
    },
    guiComponents:
      creation.gui_components === undefined
        ? ""
        : JSON.stringify(creation.gui_components, null, 2),
  };
}

/** The comparable creation for a form state (same normalization both ways). */
export function comparableCreation(
  values: AgentFormValues
): Record<string, unknown> {
  return creationFromForm(values);
}

export function baseCreation(server: ServerDraft): Record<string, unknown> {
  return comparableCreation(formFromCreation(server.draft.creation));
}

export function dirtyFields(
  local: Record<string, unknown>,
  base: Record<string, unknown>
): DraftField[] {
  return DRAFT_FIELDS.filter(
    (field) => draftKey(local[field]) !== draftKey(base[field])
  );
}

/** Only dirty, structurally storable fields are sent; invalid GUI JSON stays local. */
export function savePayload(
  local: Record<string, unknown>,
  base: Record<string, unknown>
): {
  changes: Record<string, unknown>;
  remove: DraftField[];
  unsaveable: DraftField[];
} {
  const changes: Record<string, unknown> = {};
  const remove: DraftField[] = [];
  const unsaveable: DraftField[] = [];
  for (const field of dirtyFields(local, base)) {
    const value = local[field];
    if (
      field === "gui_components" &&
      value !== undefined &&
      !Array.isArray(value)
    ) {
      unsaveable.push(field);
    } else if (value === undefined) {
      remove.push(field);
    } else {
      changes[field] = value;
    }
  }
  return { changes, remove, unsaveable };
}

export type FieldConflict = {
  field: DraftField;
  mine: unknown;
  theirs: unknown;
};

/**
 * Three-way, per-field rebase of unsaved local edits onto a newer server revision.
 * Fields the human did not change take the server value; a changed field the server
 * did not change keeps the local value; a field changed on both sides becomes an
 * explicit conflict (the local value is kept until the human chooses). Nothing is
 * ever overwritten silently.
 */
export function rebase(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  server: Record<string, unknown>
): { merged: Record<string, unknown>; conflicts: FieldConflict[] } {
  const merged: Record<string, unknown> = { ...server };
  const conflicts: FieldConflict[] = [];
  for (const field of DRAFT_FIELDS) {
    const mine = draftKey(local[field]);
    if (mine === draftKey(base[field])) continue; // Not edited locally: take server.
    merged[field] = local[field];
    const theirs = draftKey(server[field]);
    if (theirs !== draftKey(base[field]) && theirs !== mine)
      conflicts.push({ field, mine: local[field], theirs: server[field] });
  }
  return { merged, conflicts };
}

/** Rebuild editor values from a creation-shaped record (inverse of creationFromForm). */
export function formFromComparable(
  creation: Record<string, unknown>
): AgentFormValues {
  const gui = creation.gui_components;
  const values = formFromCreation({
    ...creation,
    gui_components: Array.isArray(gui) ? gui : undefined,
  });
  return typeof gui === "string" ? { ...values, guiComponents: gui } : values;
}

export class DraftRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    readonly retryable = false,
    readonly detail: {
      current_revision?: number;
      conflicting_fields?: string[];
      applicable_fields?: string[];
    } = {}
  ) {
    super(draftReason(status, code));
  }
}

const REASONS: Record<string, string> = {
  "draft.revision_conflict":
    "The draft changed elsewhere. Your unsaved edits were kept and merged; review any conflicts.",
  "draft.approved":
    "This draft is approved and frozen. Reopen it to edit (a new review will be needed).",
  "draft.consumed": "This draft created an Agent and is read-only.",
  "draft.creation_in_progress":
    "An Agent is being created from this draft's approval; it cannot be reopened now.",
  "draft.not_found": "Draft not found.",
  "draft.unavailable": "The draft service is unavailable. Retrying is safe.",
  "proposal.field_conflict":
    "Some selected fields changed after the proposal was made. Accept only the applicable fields.",
  "proposal.already_decided": "This proposal was already decided.",
  "proposal.decision_in_progress":
    "Another decision on this proposal is in progress.",
  "proposal.expired": "This proposal expired.",
  "idempotency.conflict":
    "This request key was already used for different content.",
};

export function draftReason(status: number, code?: string): string {
  if (code && REASONS[code]) return REASONS[code];
  if (status === 403)
    return "Draft access denied: an authorized session is required.";
  if (status === 422) return "The server rejected this draft content.";
  return code ?? `Draft service unavailable (HTTP ${status}).`;
}

export async function draftRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  init: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: init.signal,
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new DraftRequestError(
      response.status,
      typeof data?.code === "string" ? data.code : undefined,
      data?.retryable === true,
      {
        current_revision:
          typeof data?.current_revision === "number"
            ? data.current_revision
            : undefined,
        conflicting_fields: Array.isArray(data?.conflicting_fields)
          ? data.conflicting_fields
          : undefined,
        applicable_fields: Array.isArray(data?.applicable_fields)
          ? data.applicable_fields
          : undefined,
      }
    );
  return schema.parse(data);
}
