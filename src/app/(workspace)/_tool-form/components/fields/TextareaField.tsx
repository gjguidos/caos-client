
"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { TextareaFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";
import { extractAndValidatePDFText } from "@/shared/lib/pdfTextExtractor";
import { useToast } from "@/shared/hooks/useToast";

function getUploadButtonText(
  uploading: boolean,
  hasValue: boolean
): string {
  if (uploading) return "Processing PDF...";
  if (hasValue) return "Clear text";
  return "Upload PDF";
}

export function TextareaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  fileUpload = false,
}: TextareaFieldProps) {
  const { showError, showSuccess } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const hasValue = Boolean(value?.trim());
  const helperId = `${id}-helper`;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Reset the picker so the same file can be selected again.
    event.target.value = "";

    if (file.type !== "application/pdf") {
      showError("Invalid file type", {
        description: "Please upload a PDF file.",
      });
      return;
    }

    setUploading(true);

    try {
      const extractedText =
        await extractAndValidatePDFText(file);

      onChange(extractedText);

      showSuccess("PDF processed", {
        description: "Text has been extracted from the PDF.",
      });
    } catch (err) {
      showError("PDF extraction failed", {
        description:
          err instanceof Error
            ? err.message
            : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAction = () => {
    if (disabled || uploading) return;

    if (hasValue) {
      onChange("");
      return;
    }

    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-2">
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

        <Textarea
          id={id}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          disabled={disabled || uploading}
          required={required}
          aria-describedby={
            placeholder ? helperId : undefined
          }
          className="min-h-32 resize-y"
        />

        {placeholder && (
          <p
            id={helperId}
            className="text-xs text-muted-foreground"
          >
            {placeholder}
          </p>
        )}
      </div>

      {fileUpload && (
        <div>
          <input
            ref={fileInputRef}
            id={`${id}-file-input`}
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              void handleFileSelect(event);
            }}
            className="sr-only"
            disabled={disabled || uploading}
            aria-label={`Upload PDF for ${label}`}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadAction}
            disabled={disabled || uploading}
            aria-busy={uploading}
          >
            {uploading ? (
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : hasValue ? (
              <Trash2
                className="size-4"
                aria-hidden="true"
              />
            ) : (
              <FileUp
                className="size-4"
                aria-hidden="true"
              />
            )}

            {getUploadButtonText(uploading, hasValue)}
          </Button>
        </div>
      )}
    </div>
  );
}
