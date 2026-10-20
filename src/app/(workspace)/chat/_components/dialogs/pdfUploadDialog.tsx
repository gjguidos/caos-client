import { postCollectionWithProgress } from "../../_api/PostCollectionWithProgress";
import { Button } from "@/components/ui/button";
import { FileUploadDropzone } from "./FileUploadDropzone";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/Dialog/Dialog";
import {
  extractTextFromPDF,
  validatePDFSize,
} from "@/shared/lib/pdfTextExtractor";
import { useState } from "react";
import { useToast } from "@/shared/hooks/useToast";

export function PDFUploadDialog({
  open,
  onClose,
  collectionName,
  agent_id,
  user_id,
}: {
  open: boolean;
  onClose: () => void;
  collectionName: string;
  agent_id: string;
  user_id: string;
}) {
  const { showError, showSuccess } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleConfirm = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await extractTextFromPDF(file);
      const validation = validatePDFSize(result.fileSizeMB, result.textSizeMB);

      if (!validation.valid) {
        showError("Upload rejected", {
          description: validation.error,
        });
        setUploading(false);
        return;
      }

      await postCollectionWithProgress({
        agent_id,
        collection_name: collectionName,
        metadata: {
          name: collectionName,
          agent_id,
          user_id: user_id,
          visibility: "private",
          chunk_size: 1000,
          chunk_overlap: 200,
          embedding_model: "openai-embedding-v2",
          vector_metric: "cosine",
          prompt_template: "",
          description: "Uploaded via dialog",
        },
        file,
        onProgress: (percent) => setUploadProgress(percent),
      });

      showSuccess("Upload successful", {
        description: "Your document has been added.",
      });

      onClose();
      setFile(null);
      setUploadProgress(0);
    } catch (err) {
      showError("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader>
          <DialogTitle>Upload a PDF</DialogTitle>
          <p className="text-sm text-muted-foreground">
            📚 Collection: <strong>{collectionName}</strong>
          </p>
        </DialogHeader>

        <FileUploadDropzone file={file} setFile={setFile} />

        {uploading && (
          <div className="mt-2 text-sm text-muted-foreground">
            Uploading... {uploadProgress.toFixed(0)}%
            <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button disabled={!file || uploading} onClick={handleConfirm}>
            Confirm Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
