import { getPublicApiBase } from "@/shared/lib/getApiClient";
import fetchData from "@/shared/lib/server-actions";

type SoulApiResponse<T> = { success: boolean; data: T } | null;

/**
 * A personality's soul: sections of free-form settings, keyed by section name.
 *
 * The sections themselves are open - the soul protocol schema decides what they
 * hold, and `structureSoul` pairs the two for display. `basic_profile` is named
 * because callers read its description directly, and a shape every caller
 * re-asserts by hand is a shape that belongs here.
 */
export interface Soul {
  basic_profile?: { description?: string } & Record<string, unknown>;
  [section: string]: Record<string, unknown> | undefined;
}

export async function fetchSoul(archetype: string) {
  const BASE = getPublicApiBase();
  if (!BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }
  return await fetchData<SoulApiResponse<Soul>>({
    path: `${BASE}/v1/agents/personalities/${encodeURIComponent(archetype)}/soul`,
    method: "GET",
  });
}

export async function fetchSoulSchema() {
  const BASE = getPublicApiBase();
  if (!BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE in environment");
  }
  return await fetchData<SoulApiResponse<unknown>>({
    path: `${BASE}/v1/agents/soul-protocol/schema`,
    method: "GET",
  });
}
