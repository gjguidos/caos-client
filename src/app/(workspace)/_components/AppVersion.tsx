"use client";

import { useAppVersion } from "../_hooks/useAppVersion";

export function AppVersion({ className }: { className?: string }) {
  const version = useAppVersion();

  // A build with no version to report says nothing, rather than telling the
  // person reading it about an environment problem they cannot act on.
  if (!version) return null;

  return <div className={`${className} text-xs text-gray-500`}>{version}</div>;
}
