import { getServerSession } from "@/shared/auth/lib/session";
import { getApiAccessToken } from
  "@/shared/auth/lib/get-api-token";
import { logger } from "@/shared/lib/logger";
import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for MSAL token cache access
export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Log session details for debugging
    logger.debug("Session found for WebSocket token request:", {
      sub: session.sub,
      preferred_username: session.preferred_username,
      homeAccountId: session.homeAccountId,
    });

    // Get the Microsoft access token for API calls
    const token = await getApiAccessToken(session);
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 401 }
      );
    }

    // Validate token format before returning
    const parts = token.split(".");
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 500 }
      );
    }

    // Log detailed token info for debugging
    try {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      logger.debug("Token details:", {
        alg: header.alg,
        typ: header.typ,
        aud: payload.aud,
        iss: payload.iss,
        exp: new Date(payload.exp * 1000).toISOString(),
      });
    } catch (e) {
      logger.debug(
        "Failed to parse token details in WebSocket token route:",
        e
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
