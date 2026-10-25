import "server-only";
import { readHistory } from "@/shared/communication-v2/history";
import { getBaseUrl } from "@/shared/auth/lib/utils";

import { getApiAccessToken } from "@/shared/auth/lib/get-api-token";
import { readSession } from "@/shared/auth/lib/session";

/** Fixed server-owned upstream; no browser bearer, grants, tenant or owner. */
export async function proxyCommunication(
  req: Request,
  operation: "ticket" | "conversations",
  conversationId?: string,
  history = false
) {
  const headers = { "Cache-Control": "no-store" };
  if (req.method !== "GET" && req.headers.get("origin") !== getBaseUrl(req)) {
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403, headers }
    );
  }
  if (conversationId !== undefined && !/^[\w-]{1,128}$/.test(conversationId)) {
    return Response.json(
      { error: "Invalid conversation ID" },
      { status: 400, headers }
    );
  }
  let suffix = "";
  if (history) {
    if (!conversationId || req.method !== "GET")
      return Response.json(
        { error: "Invalid history request" },
        { status: 400, headers }
      );
    const query = new URL(req.url).searchParams;
    const cursor = query.get("cursor");
    const limit = query.get("limit");
    if (
      (cursor !== null &&
        (cursor.length > 512 || !/^[A-Za-z0-9_=-]+$/.test(cursor))) ||
      (limit !== null &&
        (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100))
    )
      return Response.json(
        { error: "Invalid history window" },
        { status: 400, headers }
      );
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", limit);
    suffix = `/history${params.size ? `?${params}` : ""}`;
  }
  const base = process.env.GENESIS_COMMUNICATION_URL;
  const session = await readSession(req);
  if (!session)
    return Response.json({ error: "Login required" }, { status: 401, headers });
  if (!base)
    return Response.json(
      { error: "Genesis communication is disabled" },
      { status: 503, headers }
    );
  try {
    const token = await getApiAccessToken(session);
    let body: string | undefined;
    if (operation === "conversations" && conversationId === undefined) {
      const reader = req.body?.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      body = "";
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 4096) {
              await reader.cancel();
              return Response.json(
                { error: "Request too large" },
                { status: 413, headers }
              );
            }
            body += decoder.decode(value, { stream: true });
          }
          body += decoder.decode();
        } finally {
          reader.releaseLock();
        }
      }
    }
    const response = await fetch(
      `${base.replace(/\/$/, "")}/${operation}${conversationId ? `/${encodeURIComponent(conversationId)}` : ""}${suffix}`,
      {
        method: conversationId ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok)
      return Response.json(
        { error: "Genesis request denied or unavailable" },
        {
          status: [401, 403, 404, 422].includes(response.status)
            ? response.status
            : 503,
          headers,
        }
      );
    const envelope = await response.json();
    // Production FastAPI middleware wraps HTTP payloads; focused ASGI routes do not.
    const data =
      envelope?.success === true &&
      envelope.data &&
      typeof envelope.data === "object"
        ? envelope.data
        : envelope;
    if (
      operation === "ticket" &&
      (typeof data?.ticket !== "string" || !data.ticket)
    ) {
      throw new Error("Invalid ticket response");
    }
    // Whitelist ticket fields so an upstream change cannot expose a bearer.
    const result = history
      ? readHistory(data)
      : operation === "ticket"
        ? {
            ticket: data.ticket,
            expires_in: data.expires_in,
            websocket_path: data.websocket_path,
          }
        : { id: data?.id, agent_ids: data?.agent_ids };
    return Response.json(result, {
      status: conversationId ? 200 : 201,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Genesis request unavailable" },
      { status: 503, headers }
    );
  }
}
