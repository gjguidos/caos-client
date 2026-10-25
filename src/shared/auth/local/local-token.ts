import "server-only";

import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { LOCAL_ADMIN_ID, LOCAL_ADMIN_SESSION } from "./local-session";

const LOCAL_JWT_ISSUER = "CAOS-local";
const LOCAL_JWT_AUDIENCE = "CAOS-api";
const LOCAL_JWT_EXPIRATION = "15m";

function getLocalJwtSecret(): Uint8Array {
  if (
    process.env.AUTH_MODE !== "local" ||
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("Local JWT authentication is not enabled");
  }

  const secret = process.env.LOCAL_JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("LOCAL_JWT_SECRET must contain at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

/**
 * Generates a signed JWT for the local administrator.
 *
 * Compatible with FastAPI / python-jose using HS256.
 * Must only be called from server-side code.
 */
export async function createLocalAccessToken(): Promise<string> {
  const secret = getLocalJwtSecret();

  return new SignJWT({
    tid: "caos-local",
    sid: randomUUID(),
    oid: LOCAL_ADMIN_ID,
    email: LOCAL_ADMIN_SESSION.preferred_username,
    preferred_username: LOCAL_ADMIN_SESSION.preferred_username,
    name: LOCAL_ADMIN_SESSION.name,
    roles: LOCAL_ADMIN_SESSION.roles ?? [],
    scp: "",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(LOCAL_ADMIN_ID)
    .setIssuer(LOCAL_JWT_ISSUER)
    .setAudience(LOCAL_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(LOCAL_JWT_EXPIRATION)
    .sign(secret);
}
