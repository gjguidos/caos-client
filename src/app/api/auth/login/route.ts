import { createLocalAccessToken } from "@/shared/auth/local/local-token";
import { getLocalSession } from "@/shared/auth/local/local-session";
import { setSessionCookie } from "@/shared/auth/lib/session";
import { getBaseUrl } from "@/shared/auth/lib/utils";
import { storePkceCode } from "@/shared/auth/msal/pkce";
import { getMsalClient } from "@/shared/auth/msal/server-client";
import { logger } from "@/shared/lib/logger";
import { CryptoProvider } from "@azure/msal-node";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Force Node.js runtime for file system access
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    if (
      process.env.AUTH_MODE === "local" &&
      process.env.NODE_ENV !== "production"
    ) {
      const session = getLocalSession();
      if (process.env.GENESIS_LOGOUT_REQUIRED === "true") {
        const endpoint = process.env.GENESIS_LOCAL_SESSION_URL;
        if (!endpoint) throw new Error("GENESIS_LOCAL_SESSION_URL missing");
        const token = await createLocalAccessToken();
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(5000),
        });
        if (upstream.status !== 201)
          throw new Error("Local session provisioning failed");
        session.localAccessToken = token;
      }
      const res = NextResponse.redirect(`${getBaseUrl(req)}/`, { status: 302 });
      await setSessionCookie(res, session);
      return res;
    }
    const msal = getMsalClient();

    // Generate PKCE codes
    const cryptoProvider = new CryptoProvider();
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();
    const challengeMethod = "S256";

    // Generate a session ID to track PKCE codes
    const sessionId = uuidv4();
    await storePkceCode(sessionId, { verifier, challenge, challengeMethod });

    const authRequest = {
      scopes: [
        "openid",
        "profile",
        "offline_access",
        process.env.ENTRA_API_SCOPES!,
      ],
      redirectUri: process.env.NEXT_SERVER_BASE_URL! + "/api/auth/callback",
      prompt: "select_account",
      codeChallenge: challenge,
      codeChallengeMethod: challengeMethod,
      state: sessionId,
    };

    const url = await msal.getAuthCodeUrl(authRequest);
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    logger.error(
      "Login initiation error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Use absolute redirect to satisfy Next.js server/runtime requirements
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/?auth=login_error`, {
      status: 302,
    });
  }
}
