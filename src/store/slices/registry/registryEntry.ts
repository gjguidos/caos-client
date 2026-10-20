/**
 * The shape every agent-registry entry shares (tools, souls, roles, rule packs,
 * agent types) and the canonical way to look one up.
 *
 * An entry is identified by its `key` — that is what agent payloads, form values
 * and `@<tool>` tokens store. `name` is display-only; never match on it.
 */

import { logger } from "@/shared/lib/logger";

export type RegistryEntry<TMetadata = Record<string, unknown>> = {
  key: string;
  name: string;
  description?: string;
  version?: string;
  metadata?: TMetadata;
  registration_time?: string;
};

/** A tool reference carried by an agent-type's `default_tools`. */
export type DefaultToolRef = { key: string; name: string; toolclass?: string };

/** Find a registry entry by `key`. Returns null for a missing key or entry. */
export function findByKey<T extends { key: string }>(
  entries: readonly T[],
  key: string | undefined | null
): T | null {
  return key ? (entries.find((e) => e.key === key) ?? null) : null;
}

/**
 * Display name for a registry key. Falls back to the key itself so an entry
 * missing from the registry still renders something recognizable.
 */
export function labelForKey(
  entries: readonly RegistryEntry[],
  key: string | undefined | null
): string {
  return key ? (findByKey(entries, key)?.name ?? key) : "";
}

/**
 * Guard the registry boundary: the app treats `key` as required, but the
 * registry response is unvalidated JSON. Drop entries the backend sent without
 * one rather than letting `undefined` keys reach React keys, lookups and the
 * `@<key>` invoke token.
 */
export function withValidKeys<T extends { key?: string }>(
  entries: T[],
  registryType: string
): T[] {
  const valid = entries.filter((e) => typeof e.key === "string" && e.key);
  const dropped = entries.length - valid.length;
  if (dropped > 0) {
    logger.warn(
      `Dropped ${dropped} ${registryType} registry entries with no key`
    );
  }
  return valid;
}
