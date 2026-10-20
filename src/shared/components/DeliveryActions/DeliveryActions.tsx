
"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { DeliveredResource } from "@/app/(workspace)/_types/chat.types";
import { downloadBlob } from "@/shared/lib/download";

/**
 * Human-readable label for a delivered resource.
 */
function deliveryLabel(
  resource: DeliveredResource
): string {
  return (
    resource.label ||
    resource.name ||
    resource.id ||
    "Download"
  )
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

/**
 * Extract a filename from the Content-Disposition header.
 *
 * Supports both:
 * - filename*=UTF-8''...
 * - filename="..."
 */
function filenameFromDisposition(
  disposition: string | null
): string | null {
  if (!disposition) {
    return null;
  }

  const utf8Match = disposition.match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = disposition.match(
    /filename="?([^";]+)"?/i
  );

  return filenameMatch?.[1] ?? null;
}

/**
 * Fallback filename when no Content-Disposition
 * filename is provided by the server.
 */
function fallbackFilename(
  resource: DeliveredResource
): string {
  const stem =
    resource.id ||
    resource.name ||
    "download";

  return `${stem}.json`;
}

/**
 * Download button for one delivered resource.
 *
 * Bearer-authenticated resources are routed through
 * the existing /api/delivery proxy.
 */
function DeliveryAction({
  resource,
}: Readonly<{
  resource: DeliveredResource;
}>) {
  const [downloading, setDownloading] =
    useState(false);

  const delivery = resource.delivery;
  const label = deliveryLabel(resource);

  const handleDownload = async () => {
    if (downloading) {
      return;
    }

    setDownloading(true);

    try {
      const method = (
        delivery.method || "GET"
      ).toUpperCase();

      if (method !== "GET") {
        throw new Error(
          `Unsupported delivery method: ${method}`
        );
      }

      const target =
        delivery.auth?.type === "bearer"
          ? `/api/delivery?url=${encodeURIComponent(
              delivery.url
            )}`
          : delivery.url;

      const response = await fetch(target, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Download failed with status ${response.status}`
        );
      }

      const blob = await response.blob();

      const filename =
        filenameFromDisposition(
          response.headers.get(
            "content-disposition"
          )
        ) ||
        fallbackFilename(resource);

      downloadBlob(blob, filename);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Download ${label}`}
      aria-busy={downloading}
      disabled={downloading}
      onClick={() => {
        void handleDownload();
      }}
      className="h-8 gap-2 px-2 text-xs"
    >
      {downloading ? (
        <Loader2
          className="size-3.5 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Download
          className="size-3.5"
          aria-hidden="true"
        />
      )}

      <span className="truncate">
        {downloading
          ? "Downloading…"
          : label}
      </span>
    </Button>
  );
}

/**
 * Render download actions for delivered resources.
 */
export function DeliveryActions({
  resources,
}: Readonly<{
  resources?: DeliveredResource[];
}>) {
  if (!resources?.length) {
    return null;
  }

  return (
    <>
      {resources.map((resource, index) => (
        <DeliveryAction
          key={
            resource.delivery.url ||
            `${resource.id}-${index}`
          }
          resource={resource}
        />
      ))}
    </>
  );
}
