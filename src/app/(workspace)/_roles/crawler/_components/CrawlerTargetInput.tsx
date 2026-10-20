
"use client";

import type { ReactNode } from "react";
import { Loader2, Globe, X, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CrawlTargetInputProps = {
  value: string;
  onChange: (value: string) => void;

  hasSession: boolean;
  browserReady: boolean;

  isRunning: boolean;
  isClosingSession: boolean;
  isStarting?: boolean;
  isCapturing?: boolean;
  sessionError?: string | null;

  actions?: ReactNode;

  onCloseSession: () => void;
  onStartBrowserSession?: () => void;
  onCaptureBrowserSession?: () => void;
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CrawlTargetInput({
  value,
  onChange,
  hasSession,
  browserReady,
  isRunning,
  isClosingSession,
  isStarting = false,
  isCapturing = false,
  sessionError,
  actions,
  onCloseSession,
  onStartBrowserSession,
  onCaptureBrowserSession,
}: CrawlTargetInputProps) {
  const hasValidUrl = isValidUrl(value);

  const sessionStatus = !hasSession
    ? "No browser session"
    : browserReady
      ? "Session ready"
      : "Waiting for sign in";

  const sessionBusy =
    isRunning || isClosingSession || isStarting || isCapturing;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label
          htmlFor="crawler-target-url"
          className="text-sm font-semibold"
        >
          Target URL
        </Label>

        <Input
          id="crawler-target-url"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://www.example.com"
          className="h-12"
          disabled={isRunning}
          aria-invalid={Boolean(value.trim()) && !hasValidUrl}
          aria-describedby={
            value.trim() && !hasValidUrl
              ? "crawler-target-url-error"
              : undefined
          }
        />

        {!hasValidUrl && value.trim() && (
          <p
            id="crawler-target-url-error"
            className="text-xs text-destructive"
            role="alert"
          >
            Enter a valid HTTP or HTTPS URL.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          {browserReady ? (
            <CheckCircle2
              className="size-4 text-green-600"
              aria-hidden="true"
            />
          ) : (
            <Globe className="size-4" aria-hidden="true" />
          )}

          <span>{sessionStatus}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hasSession && onStartBrowserSession && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sessionBusy || !hasValidUrl}
              onClick={onStartBrowserSession}
            >
              {isStarting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isStarting ? "Starting..." : "Start browser session"}
            </Button>
          )}

          {hasSession && !browserReady && onCaptureBrowserSession && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sessionBusy}
              onClick={onCaptureBrowserSession}
            >
              {isCapturing && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isCapturing ? "Checking sign in..." : "I have signed in"}
            </Button>
          )}

          {hasSession && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={sessionBusy}
              onClick={onCloseSession}
            >
              {isClosingSession ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              {isClosingSession ? "Closing..." : "Close session"}
            </Button>
          )}
        </div>
      </div>

      {sessionError && (
        <p className="text-xs text-destructive" role="alert">
          {sessionError}
        </p>
      )}

      {actions && <div className="pt-2">{actions}</div>}
    </div>
  );
}
