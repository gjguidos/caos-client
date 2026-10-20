
"use client";

import { FileText } from "lucide-react";

import { formatSize } from "@/shared/lib/fileSize";
import { useAppSelector } from "@/store/hooks";
import { selectUploadedFile } from "@/store/slices/uploadedFiles/uploadedFilesSlice";

import { ImageValue } from "./StepOutput";

/**
 * Displays a workflow file output.
 *
 * File metadata is resolved from the current session's
 * uploaded-file store. Opaque file IDs are never displayed.
 *
 * Images use the shared ImageValue component so uploaded
 * and generated images share the same presentation.
 */
export function FileValue({
  fileId,
}: Readonly<{ fileId: string }>) {
  const file = useAppSelector((state) =>
    selectUploadedFile(state, fileId)
  );

  const caption = file
    ? `${file.name} · ${formatSize(file.size)}`
    : null;

  if (file?.previewUrl && file.mime.startsWith("image/")) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-2">
        <ImageValue
          images={[{ url: file.previewUrl }]}
          alt={file.name}
        />

        <p
          className="max-w-full truncate text-xs text-muted-foreground"
          title={caption ?? undefined}
        >
          {caption}
        </p>
      </div>
    );
  }

  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${
        caption
          ? "text-foreground"
          : "text-muted-foreground"
      }`}
    >
      <FileText
        className="size-4 shrink-0"
        aria-hidden="true"
      />

      <span
        className="min-w-0 truncate text-sm"
        title={caption ?? "Uploaded file"}
      >
        {caption ?? "Uploaded file"}
      </span>
    </span>
  );
}
