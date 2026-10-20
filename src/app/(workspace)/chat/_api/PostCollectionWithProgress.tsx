import { getPublicApiBase } from "@/shared/lib/getApiClient";

export async function getUploadToken(): Promise<string> {
  const response = await fetch("/api/auth/websocket-token");
  if (!response.ok) {
    throw new Error("Failed to get upload token");
  }
  const { token } = await response.json();
  return token;
}

export async function postCollectionWithProgress({
  agent_id,
  collection_name,
  metadata = {},
  file,
  onProgress,
}: {
  agent_id: string;
  collection_name: string;
  metadata?: Record<string, any>;
  file?: File;
  onProgress: (percent: number) => void;
}) {
  const MAX_FILE_SIZE_MB = 10;
  const MAX_TEXT_SIZE_BYTES = 2 * 1024 * 1024;

  const token = await getUploadToken();

  if (file) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const textSizeBytes = metadata.text_size_bytes || 0;
    const textSizeMB = (textSizeBytes / (1024 * 1024)).toFixed(1);

    if (
      file.size > MAX_FILE_SIZE_MB * 1024 * 1024 ||
      textSizeBytes > MAX_TEXT_SIZE_BYTES
    ) {
      return Promise.reject(
        new Error(
          `Upload rejected:\n- File size: ${fileSizeMB}MB (limit: ${MAX_FILE_SIZE_MB}MB)\n- Text size: ${textSizeMB}MB (limit: 2MB)`
        )
      );
    }
  }

  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }

  formData.append("collection_metadata", JSON.stringify(metadata));

  const base = getPublicApiBase();
  const url = `${base}/v1/agents/${agent_id}/collection/${encodeURIComponent(collection_name)}/ingest-pdf`;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            xhr.responseText || `Upload failed with status ${xhr.status}`
          )
        );
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}
