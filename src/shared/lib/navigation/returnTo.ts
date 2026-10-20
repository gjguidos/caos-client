"use client";

import { useSearchParams } from "next/navigation";

/** Query param carrying where the user came from, so editors can send them back. */
export const RETURN_TO_PARAM = "from";

/**
 * Narrow a `?from=` value to a same-origin path we are willing to navigate to.
 *
 * Only relative paths are accepted. Anything protocol-relative (`//evil.com`),
 * backslash-escaped (`/\evil.com`, which some browsers normalise to `//`), or
 * absolute is an open redirect, so it falls back instead.
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/**
 * Where the current editor should return to when the user backs out or saves.
 *
 * Must be rendered under a `<Suspense>` boundary: `useSearchParams` opts the
 * subtree into client-side rendering.
 */
export function useReturnTo(fallback: string): string {
  const searchParams = useSearchParams();
  return safeReturnTo(searchParams.get(RETURN_TO_PARAM), fallback);
}

/** Append the current location to an editor link so it can return here. */
export function withReturnTo(href: string, from: string | null): string {
  if (!from) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${RETURN_TO_PARAM}=${encodeURIComponent(from)}`;
}
