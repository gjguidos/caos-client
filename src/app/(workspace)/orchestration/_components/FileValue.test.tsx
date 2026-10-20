import { render, screen } from "@/test-utils/test-utils";
import type { UploadedFile } from "@/store/slices/uploadedFiles/uploadedFilesSlice";
import { describe, expect, it } from "vitest";
import { FileValue } from "./FileValue";

const IMAGE_ID = "f_0af6137ad4df41dea02eb3cb2d994210";
const DOC_ID = "f_1b2c3d4e5f60718293a4b5c6d7e8f900";

function renderValue(fileId: string, files: UploadedFile[] = []) {
  return render(<FileValue fileId={fileId} />, {
    preloadedState: {
      uploadedFiles: {
        byId: Object.fromEntries(files.map((file) => [file.fileId, file])),
      },
    },
  });
}

describe("FileValue", () => {
  it("shows an uploaded image as itself", () => {
    renderValue(IMAGE_ID, [
      {
        fileId: IMAGE_ID,
        name: "bathroom.png",
        mime: "image/png",
        size: 2048,
        previewUrl: "blob:mock/1",
      },
    ]);

    expect(
      screen.getByRole("img", { name: "bathroom.png" })
    ).toBeInTheDocument();
    expect(screen.getByText("bathroom.png · 2 KB")).toBeInTheDocument();
  });

  it("names a file that is not an image rather than showing a broken one", () => {
    renderValue(DOC_ID, [
      {
        fileId: DOC_ID,
        name: "spec.pdf",
        mime: "application/pdf",
        size: 1048576,
        previewUrl: "blob:mock/2",
      },
    ]);

    expect(screen.getByText("spec.pdf · 1.0 MB")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("says only that a file is there when the id names nothing we uploaded", () => {
    renderValue(IMAGE_ID);

    expect(screen.getByText("Uploaded file")).toBeInTheDocument();
    // The id is the thing being replaced; it must not leak through the fallback.
    expect(screen.queryByText(IMAGE_ID)).not.toBeInTheDocument();
  });
});
