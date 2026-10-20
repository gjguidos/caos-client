
"use client";

import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ResourceListErrorProps {
  message: string;
  type?: "fetch" | "delete";
  onRetry?: () => void;
  resource?: string;
}

export function ResourceListError({
  message,
  type = "fetch",
  onRetry,
  resource = "resource",
}: Readonly<ResourceListErrorProps>) {
  const errorTitle =
    type === "fetch"
      ? `Error loading ${resource}s`
      : `Error deleting ${resource}`;

  return (
    <div
      className="mb-8 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center justify-between gap-8">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-destructive">
            {errorTitle}
          </h2>

          {message && (
            <p className="mt-2 text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </div>

        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="shrink-0 gap-2"
          >
            <RefreshCcw
              className="size-4"
              aria-hidden="true"
            />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
