"use client";

import readPublicEnv from "@/shared/lib/publicEnv";
import { useSyncExternalStore } from "react";

/** The version never changes after the page loads, so nothing to subscribe to. */
const subscribe = () => () => {};

function getSnapshot(): string {
  const { NEXT_PUBLIC_APP_VERSION } = readPublicEnv();
  if (!NEXT_PUBLIC_APP_VERSION) return "";
  return NEXT_PUBLIC_APP_VERSION.startsWith("v")
    ? NEXT_PUBLIC_APP_VERSION
    : `v${NEXT_PUBLIC_APP_VERSION}`;
}

const getServerSnapshot = () => "";

/**
 * The running build's version, `v`-prefixed, or `""` when there is none to show.
 *
 * The version comes from `public/env.js`, which is written at container start,
 * so the server has no value to render and reading it during the client's first
 * render would be a hydration mismatch. `useSyncExternalStore` is what settles
 * that: the server snapshot is empty and the client's is the real value.
 */
export function useAppVersion(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
