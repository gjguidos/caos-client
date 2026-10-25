import { SignJWT, jwtVerify } from "jose";
import type { Session } from "../auth.types";
import { getLocalSession } from "../local/local-session";

export type { Session };

const COOKIE = "app_session";
const alg = "HS256";
const SESSION_DURATION_HOURS = 8;
const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 60 * 60;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET missing");
  return new TextEncoder().encode(s);
}

function isLocalAuth(): boolean {
  return (
    process.env.AUTH_MODE === "local" && process.env.NODE_ENV !== "production"
  );
}

export async function setSessionCookie(res: Response, payload: Session) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(secret());

  // Use Secure flag only in production (HTTPS)
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "Secure; " : "";

  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}`
  );
}

export function clearSessionCookie(res: Response) {
  // Use Secure flag only in production (HTTPS)
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "Secure; " : "";

  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
  );
}

export async function readSession(req: Request): Promise<Session | null> {
  if (isLocalAuth() && process.env.GENESIS_LOGOUT_REQUIRED !== "true") {
    return getLocalSession();
  }

  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));

  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], secret());
    if (isLocalAuth() && process.env.GENESIS_LOGOUT_REQUIRED === "true") {
      if (typeof payload.localAccessToken !== "string") return null;
      const key = process.env.LOCAL_JWT_SECRET;
      if (!key) return null;
      await jwtVerify(payload.localAccessToken, new TextEncoder().encode(key), {
        algorithms: ["HS256"],
        issuer: "CAOS-local",
        audience: "CAOS-api",
      });
    }
    return payload as Session;
  } catch {
    return null;
  }
}

/**
 * Convenience helper for server components to get the current session.
 * Handles cookie extraction and request creation automatically.
 */
export async function getServerSession(): Promise<Session | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const req = new Request("http://local", {
    headers: { cookie: cookieStore.toString() },
  });
  return await readSession(req);
}
