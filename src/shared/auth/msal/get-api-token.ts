import { type Session } from "@/shared/auth/lib/session";
import { getMsalClient } from "@/shared/auth/msal/server-client";
import { logger } from "@/shared/lib/logger";

export async function getApiAccessToken(session: Session) {
  const msal = getMsalClient();
  const accounts = await msal.getTokenCache().getAllAccounts();

  // Find account by homeAccountId (primary) or username (fallback)
  const account = accounts.find(
    (a) =>
      a.homeAccountId === session.homeAccountId ||
      a.username === session.preferred_username
  );

  if (!account) {
    logger.warn(
      `MSAL account not found in server cache. Session: ${session.sub}, Cached accounts: ${accounts.length}`
    );
    throw new Error("AUTHENTICATION_REQUIRED");
  }

  try {
    const result = await msal.acquireTokenSilent({
      account,
      scopes: [process.env.ENTRA_API_SCOPES!],
    });

    return result.accessToken;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      `Token acquisition failed for ${session.preferred_username}: ${errorMsg}`
    );

    // Re-authentication required for common MSAL errors
    if (
      error instanceof Error &&
      error.message.includes("no_account_in_silent_request")
    ) {
      throw new Error("AUTHENTICATION_REQUIRED");
    }

    throw error;
  }
}
