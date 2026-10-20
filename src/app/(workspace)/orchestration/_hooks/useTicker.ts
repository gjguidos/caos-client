"use client";

import { useEffect, useState } from "react";

/**
 * Re-renders on an interval while `active`, returning the current epoch ms.
 * Drives live elapsed times without every consumer owning its own timer.
 */
export function useTicker(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return now;
}
