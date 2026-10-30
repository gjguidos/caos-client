import "server-only";
import { getBaseUrl } from "@/shared/auth/lib/utils";
import { getApiAccessToken } from "@/shared/auth/lib/get-api-token";
import { readSession } from "@/shared/auth/lib/session";

export type CreationReviewOperation =
  | "validate"
  | "approvals"
  | "revoke"
  | "create";

const ID = /^[\w-]{1,128}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_BODY = 64 * 1024;

/**
 * Fixed server-owned upstream for authoritative draft review and human approval.
 * The browser never holds the bearer and cannot choose the executor, version or
 * any identity; the API derives all of them. Approval grants no creation authority.
 */
export async function proxyCreationReview(
  req: Request,
  agentId: string,
  operation: CreationReviewOperation,
  approvalId?: string
) {
  const headers = { "Cache-Control": "no-store" };
  if (req.headers.get("origin") !== getBaseUrl(req))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403, headers }
    );
  if (
    !ID.test(agentId) ||
    (operation === "revoke") !== (approvalId !== undefined) ||
    (approvalId !== undefined && !ID.test(approvalId))
  )
    return Response.json(
      { error: "Invalid review request" },
      { status: 400, headers }
    );
  const idempotencyKey = req.headers.get("idempotency-key");
  if (operation === "create" && !IDEMPOTENCY_KEY.test(idempotencyKey ?? ""))
    return Response.json(
      { error: "Idempotency-Key required" },
      { status: 400, headers }
    );
  const base = process.env.GENESIS_AGENTS_URL;
  const session = await readSession(req);
  if (!session)
    return Response.json({ error: "Login required" }, { status: 401, headers });
  if (!base)
    return Response.json(
      { error: "Agent creation review is disabled" },
      { status: 503, headers }
    );
  let body: string | undefined;
  if (operation !== "revoke") {
    body = await req.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY)
      return Response.json(
        { error: "Request too large" },
        { status: 413, headers }
      );
  }
  const path =
    operation === "validate"
      ? "creation-draft/validate"
      : operation === "approvals"
        ? "creation-draft/approvals"
        : operation === "create"
          ? "creation-draft/create"
          : `creation-draft/approvals/${encodeURIComponent(approvalId ?? "")}/revoke`;
  try {
    const token = await getApiAccessToken(session);
    const response = await fetch(
      `${base.replace(/\/$/, "")}/${encodeURIComponent(agentId)}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(operation === "create"
            ? { "Idempotency-Key": idempotencyKey ?? "" }
            : {}),
        },
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      }
    );
    const envelope = await response.json().catch(() => null);
    // Production FastAPI middleware wraps HTTP payloads; focused ASGI routes do not.
    const data =
      envelope?.success === true &&
      envelope.data &&
      typeof envelope.data === "object"
        ? envelope.data
        : envelope;
    if (!response.ok) {
      const detail = data?.detail;
      // Only the typed code and retry hint cross the boundary, never upstream text.
      const code =
        typeof detail?.code === "string" && /^[a-z._]{1,64}$/.test(detail.code)
          ? detail.code
          : undefined;
      return Response.json(
        {
          error: "Review request denied or unavailable",
          code,
          retryable: detail?.retryable === true,
        },
        {
          status: [401, 403, 404, 409, 422].includes(response.status)
            ? response.status
            : 503,
          headers,
        }
      );
    }
    // 202: the creation is accepted or provisioning; repeat with the same key.
    return Response.json(data, {
      status: response.status === 202 ? 202 : 200,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Review request unavailable" },
      { status: 503, headers }
    );
  }
}
