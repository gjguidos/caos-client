/**
 * MIME matching shared across the file-upload surfaces: chat attachments
 * (`useFileUpload`), the Run-panel `FileField`, and the builder's file-slot
 * binding badges (`BoundReferenceControl`). One place so `type/*` wildcard
 * semantics stay identical everywhere.
 */

/** Whether `a` matches `b`; either side may be a `type/*` wildcard. */
export function mimeMatches(a: string, b: string): boolean {
  if (a === b) return true;
  const [aMajor, aSub] = a.split("/");
  const [bMajor, bSub] = b.split("/");
  return aMajor === bMajor && (aSub === "*" || bSub === "*");
}

/**
 * Whether two accepted-mime declarations can be satisfied together: true when
 * either side is absent/empty (= accepts anything), else when the sets share at
 * least one mime, honoring `type/*` wildcards on either side.
 */
export function mimesOverlap(
  a: ReadonlyArray<string> | null | undefined,
  b: ReadonlyArray<string> | null | undefined
): boolean {
  if (!a || a.length === 0 || !b || b.length === 0) return true;
  return a.some((ma) => b.some((mb) => mimeMatches(ma, mb)));
}

/**
 * Whether a concrete file's mime type is allowed by an accepted-mime list. An
 * absent/empty list accepts anything; entries may use `type/*` wildcards. Thin
 * specialization of {@link mimesOverlap} (a concrete type never has a wildcard).
 */
export function isMimeAccepted(
  fileType: string,
  accepted: ReadonlyArray<string> | null | undefined
): boolean {
  return mimesOverlap([fileType], accepted);
}
