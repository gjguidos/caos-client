import { setSessionCookie } from "@/shared/auth/lib/session";
import { extractRolesFromAccessToken } from "@/shared/auth/lib/token-utils";
import { getBaseUrl } from "@/shared/auth/lib/utils";
import { getPkceCode, removePkceCode } from "@/shared/auth/msal/pkce";
import { getMsalClient } from "@/shared/auth/msal/server-client";
import { logger } from "@/shared/lib/logger";
import { NextResponse } from "next/server";

// Force Node.js runtime for file system access
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const state = url.searchParams.get("state"); // This contains our session ID

  if (error) {
    logger.error("Microsoft authentication error:", error, errorDescription);
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(
      `${baseUrl}/?auth=microsoft_error&error=${error}&desc=${encodeURIComponent(errorDescription || "")}`
    );
  }

  if (!code) {
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/?auth=missing_code`);
  }

  if (!state) {
    logger.error("Missing state parameter in OAuth callback");
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/?auth=missing_state`);
  }

  try {
    const msal = getMsalClient();

    // Retrieve PKCE codes using the state parameter
    const pkceData = await getPkceCode(state);
    if (!pkceData) {
      logger.error("PKCE verifier not found for state");
      const baseUrl = getBaseUrl(req);
      return NextResponse.redirect(`${baseUrl}/?auth=pkce_error`);
    }

    const result = await msal.acquireTokenByCode({
      code,
      scopes: [
        "openid",
        "profile",
        "offline_access",
        process.env.ENTRA_API_SCOPES!,
      ],
      redirectUri: process.env.NEXT_SERVER_BASE_URL! + "/api/auth/callback",
      codeVerifier: pkceData.verifier, // Add PKCE verifier
    });

    // Clean up PKCE codes
    await removePkceCode(state);

    const idClaims = result.idTokenClaims as any;

    // Extract roles from Access Token
    const roles = result.accessToken
      ? extractRolesFromAccessToken(result.accessToken)
      : undefined;

    // Create session data

    const sessionData = {
      sub: String(idClaims.oid || idClaims.sub),
      name: idClaims.name,
      preferred_username: idClaims.preferred_username,
      homeAccountId: result.account?.homeAccountId,
      roles: roles,
    };

    // Set session cookie and redirect
    const baseUrl = getBaseUrl(req);
    const res = NextResponse.redirect(`${baseUrl}/`);
    await setSessionCookie(res, sessionData);
    return res;
  } catch (error) {
    logger.error(
      "OAuth callback error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/?auth=error`);
  }
}
