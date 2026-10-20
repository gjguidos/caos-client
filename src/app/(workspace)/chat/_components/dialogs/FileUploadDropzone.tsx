"use client";

import { extractTextFromPDF } from "@/shared/lib/pdfTextExtractor";
import clsx from "clsx";
import { FileText, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function formatFileSize(size: number): string {
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function FileUploadDropzone({
  file,
  setFile,
  accept = "application/pdf",
}: {
  file: File | null;
  setFile: (file: File | null) => void;
  accept?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textPreview, setTextPreview] = useState("");
  const [textSize, setTextSize] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type === accept) setFile(dropped);
  };

  const openDialog = () => fileInputRef.current?.click();
  const removeFile = () => {
    setFile(null);
    setTextPreview("");
    setTextSize(null);
  };

  useEffect(() => {
    if (!file) return;

    setLoadingPreview(true);
    extractTextFromPDF(file)
      .then(({ text, fileSizeMB, textSizeMB }) => {
        setTextPreview(text.trim().slice(0, 5000)); // limit preview length
        setTextSize(textSizeMB * 1024 * 1024); // convert MB back to bytes
      })
      .catch((err) => {
        console.error("Error extracting PDF text:", err);
        setTextPreview("Failed to extract PDF text.");
        setTextSize(null);
      })
      .finally(() => setLoadingPreview(false));
  }, [file]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={openDialog}
      className={clsx(
        "relative cursor-pointer rounded-lg border border-dashed p-6 text-center",
        file ? "border-green-500" : "border-muted"
      )}
    >
      {file ? (
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <FileText className="text-green-600" />
            <div className="text-sm">
              <p className="font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              className="ml-auto text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">
              Extracted Text Size:{" "}
              {textSize != null
                ? textSize / 1024 < 1024
                  ? `${(textSize / 1024).toFixed(1)} KB`
                  : `${(textSize / 1024 / 1024).toFixed(2)} MB`
                : "N/A"}
            </p>

            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 text-xs text-zinc-700">
              {loadingPreview ? "Extracting preview..." : textPreview}
            </pre>
          </div>
        </div>
      ) : (
        <>
          <UploadCloud className="mx-auto mb-2 h-6 w-6" />
          <span className="text-sm text-muted-foreground">
            Drag or click to upload a PDF
          </span>
        </>
      )}

      <input
        type="file"
        accept={accept}
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
    </div>
  );
}
