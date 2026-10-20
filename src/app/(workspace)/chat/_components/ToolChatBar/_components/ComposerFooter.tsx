"use client";

import { useAppVersion } from "@/app/(workspace)/_hooks/useAppVersion";

/**
 * The line under the composer: which build you are on, and the reminder that
 * answers need checking.
 *
 * The caveat carries the line, so it shows whether or not the version resolves
 * - a build number that failed to load is not a reason to drop it.
 */
export function ComposerFooter() {
  const version = useAppVersion();

  return (
    <p className="mt-50 text-center text-xs text-neutral-5">
      {version ? `CAOS-${version} - ` : ""}
      AI assistants can make mistakes. Please verify information.
    </p>
  );
}
