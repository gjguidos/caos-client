/**
 * A file's size in the largest unit that keeps it a small number, so a size
 * reads at a glance beside a filename rather than asking to be counted.
 */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
