/**
 * Client-side file downloads.
 *
 * Everything here funnels through a single temporary `<a download>` click, which
 * is the only mechanism that works across browsers for both object URLs and the
 * `data:` URLs the backend returns for images.
 */

/** Characters that are unsafe in a filename on at least one common platform. */
const UNSAFE_FILENAME = /[^a-zA-Z0-9._-]+/g;

/** Reduce an arbitrary string to a safe filename segment. */
export function safeFilenameSegment(value: string): string {
  return value.replace(UNSAFE_FILENAME, "-").replace(/^-+|-+$/g, "");
}

/**
 * Build a download filename for run artifacts:
 * `<workflow>-<run-prefix>-<parts...>.<ext>`, skipping any part that is missing.
 *
 * `parts` are whatever identifies the artifact within the run - the step, and
 * for a step that produced several files, the value's label and its position.
 * Composing them here means callers hand over the pieces rather than a
 * pre-joined string, so sanitising stays this module's job.
 */
export function buildArtifactFilename({
  workflowKey,
  runId,
  parts = [],
  extension,
}: {
  workflowKey?: string | null;
  runId?: string | null;
  parts?: string[];
  extension: string;
}): string {
  const segments = [
    workflowKey ? safeFilenameSegment(workflowKey) : "",
    runId ? safeFilenameSegment(runId).slice(0, 8) : "",
    ...parts.map(safeFilenameSegment),
  ].filter(Boolean);
  const stem = segments.length ? segments.join("-") : "output";
  return `${stem}.${extension}`;
}

function clickDownload(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    clickDownload(url, filename);
  } finally {
    // Revoking synchronously can race the download in some browsers; one tick
    // is enough for the click to have been handed off.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function downloadText(
  text: string,
  filename: string,
  mimeType = "text/plain"
): void {
  downloadBlob(
    new Blob([text], { type: `${mimeType};charset=utf-8` }),
    filename
  );
}

export function downloadJson(value: unknown, filename: string): void {
  downloadText(JSON.stringify(value, null, 2), filename, "application/json");
}

/** Download a `data:` (or any direct) URL without round-tripping through a Blob. */
export function downloadUrl(url: string, filename: string): void {
  clickDownload(url, filename);
}

/** Map an image mime type to a file extension, defaulting to `png`. */
export function extensionForMime(mimeType?: string): string {
  if (!mimeType) return "png";
  const subtype = mimeType.split("/")[1]?.split(";")[0]?.trim();
  if (!subtype) return "png";
  if (subtype === "jpeg") return "jpg";
  if (subtype === "svg+xml") return "svg";
  return safeFilenameSegment(subtype) || "png";
}
