
"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import { extractAndValidatePDFText } from "@/shared/lib/pdfTextExtractor";
import { useToast } from "@/shared/hooks/useToast";

import { MUTED_ACTION } from "../inputBarStyles";

export interface FileUploadButtonProps {
  inputId: string;
  onChange: (value: string) => void;
  onFilename?: (filename: string) => void;
}

export function FileUploadButton({
  inputId,
  onChange,
  onFilename,
}: FileUploadButtonProps) {
  const { showError, showSuccess } = useToast();
  const { isThinking } = useToolForm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Allow the same file to be selected again.
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
      onFilename?.(file.name);

      showSuccess("PDF processed", {
        description: "Text has been extracted from the PDF.",
      });
    } catch (err) {
      showError("PDF extraction failed", {
        description:
          err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        id={`${inputId}-file-input`}
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          void handleFileSelect(event);
        }}
        className="hidden"
        disabled={isThinking || uploading}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isThinking || uploading}
        aria-label={uploading ? "Processing PDF" : "Upload PDF"}
        aria-busy={uploading}
        title={uploading ? "Processing PDF..." : "Upload PDF"}
        className={`size-8 rounded-full ${MUTED_ACTION}`}
      >
        {uploading ? (
          <Loader2
            className="size-4 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Plus
            className="size-4"
            aria-hidden="true"
          />
        )}
      </Button>
    </>
  );
}
