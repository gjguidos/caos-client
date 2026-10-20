import readPublicEnv from "@/shared/lib/publicEnv";

let baseCache: string | null = null;
export function getPublicApiBase() {
  if (baseCache) return baseCache;
  baseCache = readPublicEnv().NEXT_PUBLIC_API_BASE || "";
  return baseCache;
}

// Example API client singleton - still lazy, now using getPublicApiBase()
let client: any | null = null;
export function getClient() {
  if (!client) {
    const base = getPublicApiBase();
    if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE");
    client = new (globalThis as any).Client()
      ? new (globalThis as any).Client(base)
      : ({} as any);
  }
  return client;
}

// Backwards-compatible default export: some modules may import the default and call it
// as a getter for the public API base. Export the runtime getter as the default.
export default getPublicApiBase;
