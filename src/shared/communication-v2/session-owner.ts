import "server-only";
import { createHash } from "node:crypto";
import type { Session } from "@/shared/auth/auth.types";

/** Opaque browser ownership marker; never serialize the retained API bearer. */
export function v2SessionOwner(session: Session | null): string | null {
  return session
    ? createHash("sha256").update(JSON.stringify(session)).digest("hex")
    : null;
}

export function v2WebsocketBase(): string | null {
  const value =
    process.env.GENESIS_WEBSOCKET_URL || process.env.GENESIS_COMMUNICATION_URL;
  if (!value || !process.env.GENESIS_COMMUNICATION_URL) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol === "http:") url.protocol = "ws:";
    return ["ws:", "wss:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}
