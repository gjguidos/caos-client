import { getServerSession } from "@/shared/auth/lib/session";
import { getApiAccessToken } from
  "@/shared/auth/lib/get-api-token";
import { getPublicApiBase } from "@/shared/lib/getApiClient";
import { logger } from "@/shared/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = await getApiAccessToken(session);
    const body = await request.json();

    const base = getPublicApiBase();
    if (!base) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_API_BASE in environment" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${base}/v1/agents/id/${encodeURIComponent(agentId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error(`[api/agents] upstream PATCH ${response.status}: ${text}`);
      return NextResponse.json(
        { error: text || `Request failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = response.status === 204 ? null : await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    logger.error(`[api/agents] PATCH error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
