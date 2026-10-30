import "server-only";
import { getBaseUrl } from "@/shared/auth/lib/utils";
import { getApiAccessToken } from "@/shared/auth/lib/get-api-token";
import { readSession } from "@/shared/auth/lib/session";

type Method = "GET" | "POST" | "PATCH";

const ID = /^[\w-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/;
const CURSOR = /^[A-Za-z0-9_-]{1,512}$/;
const FIELD = /^[a-z_]{1,32}$/;
const MAX_BODY = 192 * 1024;
const QUERY: Record<string, RegExp> = {
  status: /^(editing|approved|consumed|open|all)$/,
  state: /^(open|decided|all)$/,
  limit: /^([1-9]|[1-4][0-9]|50)$/,
  cursor: CURSOR,
};

type Route = { query?: string[]; idempotent?: boolean; body: boolean };

/**
 * The only draft operations the browser may reach, by method and path shape. Every
 * identity, owner, revision rule and lifecycle decision is enforced by the API; the
 * proxy only refuses anything else and never forwards a client bearer.
 */
function route(method: Method, path: string[]): Route | null {
  const [draftId, a, b, c] = path;
  if (draftId !== undefined && !UUID.test(draftId)) return null;
  const shape = `${method} ${path.length}${a ? ` ${a}` : ""}${c ? ` ${c}` : ""}`;
  switch (shape) {
    case "GET 0":
      return { query: ["status", "limit", "cursor"], body: false };
    case "POST 0":
      return { idempotent: true, body: true };
    case "GET 1":
      return { body: false };
    case "PATCH 1":
      return { body: true };
    case "POST 2 fork":
      return { idempotent: true, body: true };
    case "POST 2 approval":
    case "POST 2 reopen":
      return { body: true };
    case "GET 2 proposals":
      return { query: ["state", "limit", "cursor"], body: false };
    case "POST 4 revisions review":
      return /^[1-9]\d{0,8}$/.test(b ?? "") ? { body: false } : null;
    case "GET 3 proposals":
      return UUID.test(b ?? "") ? { body: false } : null;
    case "POST 4 proposals decision":
      return UUID.test(b ?? "") ? { body: true } : null;
    default:
      return null;
  }
}

export async function proxyAgentDrafts(
  req: Request,
  agentId: string,
  path: string[],
  method: Method
) {
  const headers = { "Cache-Control": "no-store" };
  if (method !== "GET" && req.headers.get("origin") !== getBaseUrl(req))
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403, headers }
    );
  const allowed = ID.test(agentId) ? route(method, path) : null;
  if (!allowed)
    return Response.json(
      { error: "Invalid draft request" },
      { status: 400, headers }
    );
  const url = new URL(req.url);
  const params = new URLSearchParams();
  for (const [name, value] of url.searchParams) {
    if (!allowed.query?.includes(name) || !QUERY[name].test(value))
      return Response.json(
        { error: "Invalid draft query" },
        { status: 400, headers }
      );
    params.set(name, value);
  }
  const idempotencyKey = req.headers.get("idempotency-key");
  if (allowed.idempotent && !IDEMPOTENCY_KEY.test(idempotencyKey ?? ""))
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
      { error: "Server drafts are disabled" },
      { status: 503, headers }
    );
  let body: string | undefined;
  if (allowed.body) {
    body = await req.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY)
      return Response.json(
        { error: "Request too large" },
        { status: 413, headers }
      );
  }
  const upstream =
    `${base.replace(/\/$/, "")}/${encodeURIComponent(agentId)}/creation-drafts` +
    path.map((segment) => `/${encodeURIComponent(segment)}`).join("") +
    (params.size ? `?${params}` : "");
  try {
    const token = await getApiAccessToken(session);
    const response = await fetch(upstream, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(allowed.idempotent
          ? { "Idempotency-Key": idempotencyKey ?? "" }
          : {}),
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const envelope = await response.json().catch(() => null);
    const data =
      envelope?.success === true &&
      envelope.data &&
      typeof envelope.data === "object"
        ? envelope.data
        : envelope;
    if (!response.ok) {
      const detail = data?.detail;
      // Only typed codes, revision numbers and field names cross the boundary.
      const fields = (value: unknown) =>
        Array.isArray(value) &&
        value.every((item) => typeof item === "string" && FIELD.test(item))
          ? value
          : undefined;
      return Response.json(
        {
          error: "Draft request denied or unavailable",
          code:
            typeof detail?.code === "string" &&
            /^[a-z._]{1,64}$/.test(detail.code)
              ? detail.code
              : undefined,
          retryable: detail?.retryable === true,
          current_revision: Number.isInteger(detail?.current_revision)
            ? detail.current_revision
            : undefined,
          conflicting_fields: fields(detail?.conflicting_fields),
          applicable_fields: fields(detail?.applicable_fields),
        },
        {
          status: [401, 403, 404, 409, 422].includes(response.status)
            ? response.status
            : 503,
          headers,
        }
      );
    }
    return Response.json(data, {
      status: response.status === 201 ? 201 : 200,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Draft service unavailable" },
      { status: 503, headers }
    );
  }
}
