import { unwrapData } from "@/shared/api/envelope";
import { getPublicApiBase } from "@/shared/lib/getApiClient";

/** The server's record of an uploaded file (`POST /v1/files`, envelope-unwrapped). */
export interface FileRef {
  file_id: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
}

/**
 * What the upload is validated against server-side: a tool (chat attachments,
 * checked against its `supports.files`) or a workflow (Run-panel file inputs,
 * checked against the declared input's `accepted_mimes`). The workflow param
 * name is provisional until the backend contract lands
 * (docs/plans/handoff-be-workflow-file-inputs.md) — keep it isolated here so a
 * rename stays a one-liner.
 */
export type UploadTarget = { targetTool: string } | { targetWorkflow: string };

function appendTarget(formData: FormData, target: UploadTarget): void {
  if ("targetTool" in target) {
    formData.append("target_tool", target.targetTool);
  } else {
    formData.append("target_workflow", target.targetWorkflow);
  }
}

export async function uploadFile(
  file: File,
  target: UploadTarget,
  accessToken: string
): Promise<FileRef> {
  const base = getPublicApiBase();
  const url = `${base}/v1/files`;

  return new Promise<FileRef>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    appendTarget(formData, target);

    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          // API wraps responses in {success, statusCode, data, message}
          const fileRef = unwrapData<FileRef>(body);
          if (!fileRef) {
            reject(new Error("Invalid response from file upload"));
            return;
          }
          resolve(fileRef);
        } catch {
          reject(new Error("Invalid response from file upload"));
        }
      } else {
        let message = `Upload failed with status ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (typeof body?.message === "string") message = body.message;
        } catch {
          // non-JSON error body — keep the default message
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("File upload failed"));

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.send(formData);
  });
}
