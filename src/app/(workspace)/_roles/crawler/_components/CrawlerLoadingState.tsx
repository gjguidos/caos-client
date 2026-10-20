"use client";

import { Globe2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

import type { OperationEventData } from
  "@/app/(workspace)/_types/event.types";

type ProgressResourceType = "page" | "sitemap";
type ProgressTotalKind = "exact" | "limit" | "dynamic";

export function CrawlerLoadingState({
  text,
  operation,
}: {
  text: string;
  operation?: OperationEventData | null;
}) {
  const progress = operation?.progress;
  const metadata = progress?.metadata ?? {};
  const global = asRecord(metadata.global) ?? {};
  const chunk = asRecord(metadata.chunk) ?? {};

  const scope = asString(metadata.scope);
  const isSitemap = scope === "sitemap";

  const current = asNumber(progress?.current);
  const total = asNumber(progress?.total);

  const successful =
    asNumber(global.successful) ??
    asNumber(metadata.successful);

  const failed =
    asNumber(global.failed) ??
    asNumber(metadata.failed);

  const pagesPerSecond =
    asNumber(global.pages_per_second) ??
    asNumber(metadata.pages_per_second);

  const elapsedSeconds =
    asNumber(global.elapsed_seconds) ??
    asNumber(metadata.elapsed_seconds);

  const etaSeconds =
    asNumber(global.eta_seconds) ??
    asNumber(metadata.eta_to_limit_seconds);

  const currentUrl =
    asString(chunk.current_url) ??
    asString(metadata.current_url);

  const chunkIndex = asNumber(chunk.index);
  const chunkPlanned = asNumber(chunk.planned);
  const chunkAcquired = asNumber(chunk.acquired);
  const chunkSuccessful = asNumber(chunk.successful);
  const chunkFailed = asNumber(chunk.failed);

  const totalChunks =
    asNumber(global.total_chunks) ??
    asNumber(metadata.total_chunks);

  const completedChunks =
    asNumber(global.chunks_completed) ??
    asNumber(metadata.chunks_completed);

  const queuedChunks =
    asNumber(global.queued_chunks) ??
    asNumber(metadata.queued_chunks);

  // For sitemap acquisition, this is the number of files still outstanding
  // in the active chunk. It is deliberately different from queuedChunks.
  const queuedInChunk = isSitemap
    ? chunkPlanned !== null
      ? Math.max(
          0,
          chunkPlanned -
            (chunkSuccessful ?? chunkAcquired ?? 0) -
            (chunkFailed ?? 0),
        )
      : null
    : asNumber(chunk.queued) ??
      asNumber(metadata.queued);

  const resourceType =
    isSitemap && progress?.phase === "page_acquisition"
      ? "page"
      : asResourceType(metadata.resource_type) ??
        (isSitemap ? "page" : null);

  const totalKind =
    asTotalKind(metadata.total_kind) ??
    (isSitemap ? "exact" : "limit");

  const progressPercent =
    current !== null &&
    total !== null &&
    total > 0 &&
    totalKind !== "dynamic"
      ? Math.min(100, Math.round((current / total) * 100))
      : null;

  const progressText =
    current !== null && total !== null && total > 0
      ? formatProgressCount({
          current,
          total,
          resourceType,
          totalKind,
        })
      : null;

  const phaseText = progress?.message || text;
  const currentResourceLabel = isSitemap
    ? "Current page in chunk"
    : "Current page";

  return (
    <div className="animate-result-enter flex min-h-[220px] items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <Globe2
            className="crawler-globe-spin h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Crawling website
          </h3>

          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {phaseText}
          </p>
        </div>

        {progressText && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {isSitemap ? "Global: " : ""}
                {progressText}
              </span>
              {progressPercent !== null && (
                <span>{progressPercent}%</span>
              )}
            </div>

            {progressPercent !== null && (
              <Progress
                value={progressPercent}
                aria-label="Crawler progress"
                aria-valuetext={`${progressPercent}% complete`}
                className="h-2"
              />
            )}
          </div>
        )}

        {isSitemap && (
          <div className="w-full space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Current chunk</span>
              {chunkIndex !== null && (
                <span>
                  Chunk {chunkIndex + 1}
                  {totalChunks !== null && ` / ${totalChunks}`}
                </span>
              )}
            </div>

            {chunkPlanned !== null && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Pages in chunk</span>
                <span>
                  {(chunkAcquired ?? 0).toLocaleString()}
                  {" / "}
                  {chunkPlanned.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {chunkSuccessful !== null && (
                <span>
                  {chunkSuccessful.toLocaleString()} successful
                </span>
              )}
              {chunkFailed !== null && (
                <span>{chunkFailed.toLocaleString()} failed</span>
              )}
              {queuedInChunk !== null && (
                <span>
                  {queuedInChunk.toLocaleString()} queued in chunk
                </span>
              )}
            </div>
          </div>
        )}

        {currentUrl && (
          <div className="w-full min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">
              {currentResourceLabel}
            </p>

            <p className="block truncate text-sm font-medium text-foreground" title={currentUrl}>
              {formatCrawlerUrl(currentUrl)}
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {successful !== null && (
            <span>{successful.toLocaleString()} successful</span>
          )}
          {failed !== null && (
            <span>{failed.toLocaleString()} failed</span>
          )}
          {!isSitemap && queuedInChunk !== null && (
            <span>{queuedInChunk.toLocaleString()} queued</span>
          )}
          {isSitemap && queuedChunks !== null && (
            <span>
              {queuedChunks.toLocaleString()} queued chunks
            </span>
          )}
        </div>

        {(elapsedSeconds !== null ||
          pagesPerSecond !== null ||
          etaSeconds !== null) && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {elapsedSeconds !== null && (
              <span>{formatDuration(elapsedSeconds)} elapsed</span>
            )}
            {pagesPerSecond !== null && (
              <span>{pagesPerSecond.toFixed(1)} pages/s</span>
            )}
            {etaSeconds !== null && (
              <span>~{formatDuration(etaSeconds)} to limit</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatProgressCount({
  current,
  total,
  resourceType,
  totalKind,
}: {
  current: number;
  total: number;
  resourceType: ProgressResourceType | null;
  totalKind: ProgressTotalKind | null;
}): string {
  const label = getResourceLabel(resourceType, total);
  const denominator = totalKind === "limit"
    ? `up to ${total.toLocaleString()}`
    : total.toLocaleString();

  return `${current.toLocaleString()} / ${denominator} ${label}`;
}

function getResourceLabel(
  resourceType: ProgressResourceType | null,
  count: number,
): string {
  const plural = count !== 1;
  if (resourceType === "sitemap") return plural ? "sitemaps" : "sitemap";
  if (resourceType === "page") return plural ? "pages" : "page";
  return plural ? "items" : "item";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asResourceType(value: unknown): ProgressResourceType | null {
  return value === "page" || value === "sitemap" ? value : null;
}

function asTotalKind(value: unknown): ProgressTotalKind | null {
  return value === "exact" ||
    value === "limit" ||
    value === "dynamic"
    ? value
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function formatDuration(seconds: number): string {
  const value = Math.max(0, Math.round(seconds));
  if (value < 60) return `${value}s`;

  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatCrawlerUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}
