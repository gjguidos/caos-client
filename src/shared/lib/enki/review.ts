import { z } from "zod";

// Authoritative server review (`caos.agent_creation_review`) and human approval
// (`caos.agent_creation_review_approval`). Neither grants creation or activation.
export const REVIEW_CONTRACT = "caos.agent_creation_review";
export const APPROVAL_CONTRACT = "caos.agent_creation_review_approval";

const digest = z.string().regex(/^[0-9a-f]{64}$/);
const timestamp = z.string().datetime({ offset: true });
const finding = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});
const neverAuthorizes = z.object({
  creation: z.literal(false),
  activation: z.literal(false),
});

export const reviewSchema = z.object({
  contract: z.literal(REVIEW_CONTRACT),
  schema_version: z.literal(1),
  source_agent_id: z.string(),
  validation: z.object({
    valid: z.boolean(),
    normalized_digest: digest.nullable().optional(),
    issues: z.array(finding),
  }),
  composition: z.object({
    compatible: z.boolean(),
    issues: z.array(finding),
    preview: z.record(z.unknown()).nullable(),
  }),
  eligibility: z.object({
    eligible: z.boolean(),
    reasons: z.array(z.string()),
  }),
  review_digest: digest.nullable(),
  validated_at: timestamp,
  expires_at: timestamp,
  capability: z
    .object({ signal: z.string(), version: z.string() })
    .passthrough(),
  authorizes: neverAuthorizes,
});
export type CreationReview = z.infer<typeof reviewSchema>;

export const approvalSchema = z.object({
  contract: z.literal(APPROVAL_CONTRACT),
  schema_version: z.literal(1),
  approval_id: z.string().min(1),
  source_agent_id: z.string(),
  state: z.enum(["pending", "approved", "revoked", "expired"]),
  review_digest: digest,
  approved_at: timestamp.nullable(),
  expires_at: timestamp,
  revoked_at: timestamp.nullable(),
  audit_event_id: z.string().nullable(),
  authorizes: neverAuthorizes,
});
export type CreationApproval = z.infer<typeof approvalSchema>;

export const CREATION_REQUEST_CONTRACT = "caos.agent_creation_request";
export const creationSchema = z.object({
  contract: z.literal("caos.agent_creation"),
  schema_version: z.literal(1),
  creation_id: z.string().min(1),
  state: z.enum(["accepted", "provisioning", "completed", "failed"]),
  approval_id: z.string(),
  source_agent_id: z.string(),
  operation_id: z.string(),
  agent_id: z.string().nullable(),
  issue_codes: z.array(z.string()),
  retryable: z.boolean(),
  authorizes: z.object({ activation: z.literal(false) }),
});
export type AgentCreation = z.infer<typeof creationSchema>;

/** Order-independent identity of a draft, so a review is stale after any edit. */
export function draftKey(value: unknown): string {
  const canonical = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(canonical)
      : item && typeof item === "object"
        ? Object.fromEntries(
            Object.keys(item as Record<string, unknown>)
              .sort()
              .map((key) => [
                key,
                canonical((item as Record<string, unknown>)[key]),
              ])
          )
        : item;
  return JSON.stringify(canonical(value));
}

const REASONS: Record<string, string> = {
  "review.stale":
    "The draft or its authority changed since it was reviewed. Validate again.",
  "review.not_eligible": "The current review is not eligible for approval.",
  "idempotency.conflict":
    "This approval attempt was already used for different content. Validate again.",
  "approval.expired": "The approval expired before it took effect.",
  "approval.revoked": "This approval was revoked.",
  "approval.not_found": "Approval not found.",
  "approval.unavailable":
    "The approval outcome is not confirmed yet. Retrying is safe.",
  "approval.consumed":
    "This approval already created (or is creating) an Agent with another request.",
  "approval.not_effective": "The approval has not taken effect.",
  "approval.mismatch":
    "The approval no longer matches the reviewed definition.",
  "creation.unavailable":
    "The creation outcome is not confirmed yet. Checking again is safe.",
  "requester.cannot_create":
    "Your account cannot create Agents, so this draft cannot be approved.",
};

export function reasonText(code: string): string {
  return REASONS[code] ?? code;
}

export class ReviewRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    readonly retryable = false
  ) {
    super(
      code
        ? reasonText(code)
        : status === 403
          ? "Review denied: an authenticated, authorized session is required."
          : status === 422
            ? "The draft does not match the review contract."
            : `Review unavailable (HTTP ${status}).`
    );
  }
}

export async function postReview<T>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  headers: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ReviewRequestError(
      response.status,
      typeof data?.code === "string" ? data.code : undefined,
      data?.retryable === true
    );
  return schema.parse(data);
}
