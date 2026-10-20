"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Gap } from "./draftStatus";

/**
 * The gap the reader is currently being sent to, if any.
 *
 * Following a gap from the spec sheet has two consequences away from the click:
 * the field explains itself inline, and a collapsed panel holding that field
 * opens. Both are reads of the same single fact, so it travels as context
 * rather than as a message written into form state and a boolean threaded down
 * four components.
 */
const ActiveGapContext = createContext<Gap | null>(null);

export function ActiveGapProvider({
  gap,
  children,
}: Readonly<{ gap: Gap | null; children: ReactNode }>) {
  return (
    <ActiveGapContext.Provider value={gap}>
      {children}
    </ActiveGapContext.Provider>
  );
}

export function useActiveGap(): Gap | null {
  return useContext(ActiveGapContext);
}

/**
 * The active gap's message, shown under the field it belongs to. Matches the
 * styling of `FormMessage` without going through form state to get there.
 */
export function GapMessage({ field }: Readonly<{ field: string }>) {
  const gap = useActiveGap();
  if (gap?.field !== field) return null;

  return <p className="text-sm font-medium text-destructive">{gap.message}</p>;
}
