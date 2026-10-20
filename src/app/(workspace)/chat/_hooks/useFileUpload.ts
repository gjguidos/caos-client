import { useCallback, useState } from "react";
import { uploadFile, type FileRef } from "@/shared/api/upload_file";
import { fetchWebSocketToken } from "@/shared/websocket/wsTokenFetcher";
import { useToast } from "@/shared/hooks/useToast";
import { isMimeAccepted } from "@/shared/lib/mime";
import type { FilesSupport } from "@/app/(workspace)/_types/chat.types";

export interface UseFileUploadOptions {
  selectedToolKey: string | null;
  filesSupport: FilesSupport | null | undefined;
}

export interface UseFileUploadReturn {
  pendingFile: FileRef | null;
  isUploading: boolean;
  /** False when a file is already pending or an upload is in progress. */
  canAddFile: boolean;
  handleFileSelect: (file: File) => Promise<void>;
  clearFile: () => void;
}

export function useFileUpload({
  selectedToolKey,
  filesSupport,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [pendingFile, setPendingFile] = useState<FileRef | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showError } = useToast();

  const canAddFile = !pendingFile && !isUploading;

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!selectedToolKey || !filesSupport) return;

      if (!isMimeAccepted(file.type, filesSupport.accepted_mimes)) {
        showError("File type not supported", {
          description: `Accepted: ${filesSupport.accepted_mimes?.join(", ")}`,
        });
        return;
      }

      if (file.size > filesSupport.max_size_bytes) {
        const limitMB = (filesSupport.max_size_bytes / (1024 * 1024)).toFixed(
          1
        );
        showError("File is too large", {
          description: `Maximum allowed size is ${limitMB} MB`,
        });
        return;
      }

      if (!canAddFile) return;

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
          { targetTool: selectedToolKey },
          token
        );
        setPendingFile(fileRef);
      } catch (err) {
        showError("File upload failed", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [selectedToolKey, filesSupport, canAddFile, showError]
  );

  const clearFile = useCallback(() => {
    setPendingFile(null);
  }, []);

  return { pendingFile, isUploading, canAddFile, handleFileSelect, clearFile };
}
