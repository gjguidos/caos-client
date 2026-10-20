
"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import type { FileFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";
import { fetchWebSocketToken } from "@/shared/websocket/wsTokenFetcher";
import { uploadFile, type FileRef } from "@/shared/api/upload_file";
import { useToast } from "@/shared/hooks/useToast";
import { isMimeAccepted } from "@/shared/lib/mime";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

/**
 * File-pick widget for a `file`-kind workflow input.
 *
 * Uploads eagerly on selection and stores only the
 * returned file_id in form state.
 *
 * File metadata remains in local component state.
 */
export function FileField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  acceptedMimes,
  uploadTarget,
}: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploaded, setUploaded] = useState<FileRef | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { showError } = useToast();

  const attached =
    typeof value === "string" && value !== "";

  const chipLabel =
    uploaded && uploaded.file_id === value
      ? `${uploaded.name} (${formatSize(uploaded.size)})`
      : "Uploaded file";

  const handleSelect = async (file: File) => {
    if (isUploading || disabled) return;

    if (!isMimeAccepted(file.type, acceptedMimes)) {
      showError("File type not supported", {
        description: `Accepted: ${acceptedMimes?.join(", ")}`,
      });
      return;
    }

    if (!uploadTarget) {
      showError("File upload failed", {
        description: "No upload target is configured for this input",
      });
      return;
    }

    setIsUploading(true);

    try {
      const token = await fetchWebSocketToken();

      if (!token) {
        showError("File upload failed", {
          description: "Could not authenticate for file upload",
        });
        return;
      }

      const fileRef = await uploadFile(
        file,
        { targetWorkflow: uploadTarget },
        token
      );

      setUploaded(fileRef);
      onChange(fileRef.file_id);
    } catch (err) {
      showError("File upload failed", {
        description:
          err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    if (disabled || isUploading) return;

    setUploaded(null);
    onChange(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={id}
        className="text-sm font-medium"
      >
        {label}

        {required && (
          <span
            className="ml-1 text-destructive"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </Label>

      {attached ? (
        <div className="flex flex-wrap items-center">
          <Badge
            variant="secondary"
            className="flex max-w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-normal"
          >
            <FileText
              className="size-4 shrink-0"
              aria-hidden="true"
            />

            <span
              className="min-w-0 truncate"
              title={chipLabel}
            >
              {chipLabel}
            </span>

            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              aria-label={`Remove ${label} file`}
              title="Remove file"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </Badge>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={
              acceptedMimes?.length
                ? acceptedMimes.join(",")
                : undefined
            }
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void handleSelect(file);
              }

              event.target.value = "";
            }}
            className="sr-only"
            disabled={disabled || isUploading}
            aria-required={required}
          />

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
              aria-busy={isUploading}
            >
              {isUploading ? (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Paperclip
                  className="size-4"
                  aria-hidden="true"
                />
              )}

              {isUploading ? "Uploading..." : "Choose file"}
            </Button>
          </div>

          {placeholder && (
            <p className="text-xs text-muted-foreground">
              {placeholder}
            </p>
          )}
        </>
      )}
    </div>
  );
}
