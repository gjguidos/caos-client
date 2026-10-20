/**
 * Utilities for working with JWT tokens from Azure AD
 */

/**
 * Decodes a JWT token and extracts the payload
 * @param token - The JWT token string
 * @returns The decoded payload object, or null if decoding fails
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return null;
    }

    // JWT uses base64url encoding (RFC 4648), convert to standard base64
    let base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed (base64 strings must be multiples of 4)
    base64 += "=".repeat((4 - (base64.length % 4)) % 4);

    const payload = JSON.parse(Buffer.from(base64, "base64").toString());

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts roles from an Azure AD access token
 * @param accessToken - The access token from Azure AD
 * @returns Array of role strings, or undefined if no valid roles claim exists
 */
export function extractRolesFromAccessToken(
  accessToken: string
): string[] | undefined {
  const payload = decodeJwtPayload(accessToken);

  if (!payload || !payload.roles) {
    return undefined;
  }

  // Validate roles is a string or array of strings
  if (Array.isArray(payload.roles)) {
    // Ensure all elements are strings
    const validRoles = payload.roles.filter(
      (role): role is string => typeof role === "string"
    );
    return validRoles.length > 0 ? validRoles : undefined;
  }

  // Handle single role (must be a string)
  if (typeof payload.roles === "string") {
    return [payload.roles];
  }

  // Invalid type, return undefined
  return undefined;
}
