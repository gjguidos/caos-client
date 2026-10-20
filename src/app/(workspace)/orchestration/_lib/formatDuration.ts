/**
 * Time formatting for the run surfaces. A run's chronology is the thing the
 * canvas can't show, so these are used everywhere durations appear: the run bar
 * clock, node meta lines, and event rail timestamps.
 */

/**
 * Compact duration: sub-minute reads as seconds with one decimal (`4.2s`),
 * anything longer as `m:ss` (`1:12`) or `h:mm:ss`.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(totalSeconds < 10 ? 1 : 0)}s`;
  }

  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Parse an ISO timestamp to epoch ms, or null when absent/unparseable. */
export function toEpochMs(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Elapsed time for a step from its timings. Returns null when the step has not
 * started; while running, measures against `now` so the caller can tick it.
 */
export function stepElapsed(
  timing: { startedAt?: string; completedAt?: string } | undefined,
  now: number
): number | null {
  const started = toEpochMs(timing?.startedAt);
  if (started === null) return null;
  const completed = toEpochMs(timing?.completedAt);
  return (completed ?? now) - started;
}

/** Wall-clock stamp for the event rail: `12:04:31.220`, always fixed width. */
export function formatEventTime(ts: number): string {
  const date = new Date(ts);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return (
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}`
  );
}
