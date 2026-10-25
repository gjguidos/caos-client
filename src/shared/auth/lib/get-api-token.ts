import "server-only";

import type { Session } from "../auth.types";

import { createLocalAccessToken } from "../local/local-token";
import { getApiAccessToken as getEntraAccessToken } from "../msal/get-api-token";

/**
 * Resolves the appropriate access token provider.
 *
 * Consumers should not know whether the token comes
 * from local authentication or Microsoft Entra.
 */
export async function getApiAccessToken(session: Session): Promise<string> {
  const authMode = process.env.AUTH_MODE ?? "entra";

  switch (authMode) {
    case "local":
      if (process.env.NODE_ENV === "production") {
        throw new Error("Local authentication is disabled in production");
      }
      if (process.env.GENESIS_LOGOUT_REQUIRED === "true") {
        if (!session.localAccessToken)
          throw new Error("Local Genesis login required");
        return session.localAccessToken;
      }
      return createLocalAccessToken();

    case "entra":
      return getEntraAccessToken(session);

    default:
      throw new Error(`Unsupported AUTH_MODE: ${authMode}`);
  }
}
