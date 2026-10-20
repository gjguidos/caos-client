import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as wsTokenFetcher from "@/shared/websocket/wsTokenFetcher";
import * as uploadFileModule from "@/shared/api/upload_file";
import { FileField } from "./FileField";

vi.mock("@/shared/api/upload_file");
vi.mock("@/shared/websocket/wsTokenFetcher");

const mockShowError = vi.fn();
vi.mock("@/shared/hooks/useToast", () => ({
  useToast: () => ({ showError: mockShowError }),
}));

const FILE_REF = {
  file_id: "f_1",
  name: "pic.png",
  mime: "image/png",
  size: 2048,
  sha256: "deadbeef",
};

const PNG = new File(["png-bytes"], "pic.png", { type: "image/png" });

/**
 * Controlled harness mirroring how `RunPanel` holds form values, so the chip
 * appears once the upload settles the file_id into the parent value.
 */
function renderField(
  opts: {
    value?: string;
    acceptedMimes?: string[];
    uploadTarget?: string;
  } = {}
) {
  const onChange = vi.fn();

  function Harness() {
    const [value, setValue] = useState<string | undefined>(opts.value);
    return (
      <FileField
        id="file-pic"
        label="Picture"
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
        acceptedMimes={opts.acceptedMimes}
        uploadTarget={opts.uploadTarget ?? "wf_report"}
      />
    );
  }

  render(<Harness />);
  return { onChange };
}

describe("FileField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockResolvedValue(
      "mock-token"
    );
    vi.mocked(uploadFileModule.uploadFile).mockResolvedValue(FILE_REF);
  });

  it("uploads on pick against the workflow target and writes the file_id", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField();

    await user.upload(screen.getByLabelText("Picture"), PNG);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("f_1"));
    expect(uploadFileModule.uploadFile).toHaveBeenCalledWith(
      PNG,
      { targetWorkflow: "wf_report" },
      "mock-token"
    );
    // Chip shows the upload response's name/size, sourced from local state.
    expect(screen.getByText(/pic\.png \(2 KB\)/)).toBeInTheDocument();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("accepts a file matching a type/* wildcard", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({ acceptedMimes: ["image/*"] });

    await user.upload(screen.getByLabelText("Picture"), PNG);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("f_1"));
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it("rejects a disallowed mime with a toast and no upload", async () => {
    const { onChange } = renderField({ acceptedMimes: ["image/png"] });
    const pdf = new File(["pdf-bytes"], "doc.pdf", {
      type: "application/pdf",
    });

    // fireEvent bypasses the accept attribute, exercising our own validation.
    fireEvent.change(screen.getByLabelText("Picture"), {
      target: { files: [pdf] },
    });

    await waitFor(() =>
      expect(mockShowError).toHaveBeenCalledWith(
        "File type not supported",
        expect.objectContaining({ description: "Accepted: image/png" })
      )
    );
    expect(uploadFileModule.uploadFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("surfaces an upload failure and leaves the value unset", async () => {
    vi.mocked(uploadFileModule.uploadFile).mockRejectedValue(
      new Error("Server error 422")
    );
    const user = userEvent.setup();
    const { onChange } = renderField();

    await user.upload(screen.getByLabelText("Picture"), PNG);

    await waitFor(() =>
      expect(mockShowError).toHaveBeenCalledWith(
        "File upload failed",
        expect.objectContaining({ description: "Server error 422" })
      )
    );
    expect(onChange).not.toHaveBeenCalled();
    // Back to pickable — not stuck in the uploading state.
    expect(screen.getByText("Choose file")).toBeInTheDocument();
  });

  it("errors instead of uploading when no upload target is configured", async () => {
    const { onChange } = renderField({ uploadTarget: "" });

    fireEvent.change(screen.getByLabelText("Picture"), {
      target: { files: [PNG] },
    });

    await waitFor(() =>
      expect(mockShowError).toHaveBeenCalledWith(
        "File upload failed",
        expect.objectContaining({
          description: "No upload target is configured for this input",
        })
      )
    );
    expect(uploadFileModule.uploadFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a removable generic chip for an externally set value", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField({ value: "f_restored" });

    // No local upload happened, so only the generic chip label is available.
    expect(screen.getByText(/Uploaded file/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove Picture file" })
    );

    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(screen.getByText("Choose file")).toBeInTheDocument();
  });
});
