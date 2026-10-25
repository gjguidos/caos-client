import { getApiAccessToken } from "@/shared/auth/lib/get-api-token";
import { clearSessionCookie, readSession } from "@/shared/auth/lib/session";
import { getBaseUrl } from "@/shared/auth/lib/utils";
import { logger } from "@/shared/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    if (process.env.GENESIS_LOGOUT_REQUIRED === "true") {
      const endpoint = process.env.GENESIS_LOGOUT_URL;
      const session = await readSession(req);
      if (!endpoint || !session) {
        throw new Error(
          "Genesis logout requires backend configuration and a session"
        );
      }
      const token = await getApiAccessToken(session);
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (upstream.status !== 204) {
        throw new Error("Backend session invalidation was not acknowledged");
      }
    }
    const baseUrl = getBaseUrl(req);
    const res = NextResponse.redirect(`${baseUrl}/`);
    clearSessionCookie(res);
    return res;
  } catch (error) {
    logger.error(
      "Logout error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    if (process.env.GENESIS_LOGOUT_REQUIRED === "true") {
      return NextResponse.json(
        { error: "Logout not acknowledged. Please retry." },
        { status: 503 }
      );
    }
    // Preserve the existing V1 logout behavior when Genesis is disabled.
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/`);
  }
}
