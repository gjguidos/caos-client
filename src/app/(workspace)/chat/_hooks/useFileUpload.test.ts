import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as uploadFileModule from "@/shared/api/upload_file";
import * as wsTokenFetcher from "@/shared/websocket/wsTokenFetcher";
import { useFileUpload } from "./useFileUpload";
import type { FilesSupport } from "@/app/(workspace)/_types/chat.types";

vi.mock("@/shared/api/upload_file");
vi.mock("@/shared/websocket/wsTokenFetcher");

const mockShowError = vi.fn();
vi.mock("@/shared/hooks/useToast", () => ({
  useToast: () => ({ showError: mockShowError }),
}));

const FILES_SUPPORT: FilesSupport = {
  max_count: 1,
  max_size_bytes: 5 * 1024 * 1024,
  accepted_mimes: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

const MOCK_FILE_REF = {
  file_id: "f_abc123",
  name: "deck.pptx",
  mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  size: 1024,
  sha256: "abc123deadbeef",
};

describe("useFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(wsTokenFetcher.fetchWebSocketToken).mockResolvedValue(
      "mock-token"
    );
    vi.mocked(uploadFileModule.uploadFile).mockResolvedValue(MOCK_FILE_REF);
  });

  it("sets pendingFile after a successful upload", async () => {
    const file = new File(["content"], "deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const { result } = renderHook(() =>
      useFileUpload({ selectedToolKey: "extract", filesSupport: FILES_SUPPORT })
    );

    await act(async () => {
      await result.current.handleFileSelect(file);
    });

    expect(result.current.pendingFile).toEqual(MOCK_FILE_REF);
    expect(mockShowError).not.toHaveBeenCalled();
    expect(uploadFileModule.uploadFile).toHaveBeenCalledWith(
      file,
      { targetTool: "extract" },
      "mock-token"
    );
  });

  it("shows error toast and skips API call when file exceeds max_size_bytes", async () => {
    const bigFile = new File(["x".repeat(6 * 1024 * 1024)], "big.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });

    const { result } = renderHook(() =>
      useFileUpload({ selectedToolKey: "extract", filesSupport: FILES_SUPPORT })
    );

    await act(async () => {
      await result.current.handleFileSelect(bigFile);
    });

    expect(result.current.pendingFile).toBeNull();
    expect(mockShowError).toHaveBeenCalledWith(
      "File is too large",
      expect.objectContaining({
        description: expect.stringMatching(/5\.0 MB/i),
      })
    );
    expect(uploadFileModule.uploadFile).not.toHaveBeenCalled();
  });

  it("shows error toast when the upload API throws", async () => {
    vi.mocked(uploadFileModule.uploadFile).mockRejectedValue(
      new Error("Server error 422")
    );
    const file = new File(["content"], "deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const { result } = renderHook(() =>
      useFileUpload({ selectedToolKey: "extract", filesSupport: FILES_SUPPORT })
    );

    await act(async () => {
      await result.current.handleFileSelect(file);
    });

    expect(result.current.pendingFile).toBeNull();
    expect(mockShowError).toHaveBeenCalledWith(
      "File upload failed",
      expect.objectContaining({ description: "Server error 422" })
    );
  });

  it("clearFile resets pendingFile", async () => {
    const file = new File(["content"], "deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const { result } = renderHook(() =>
      useFileUpload({ selectedToolKey: "extract", filesSupport: FILES_SUPPORT })
    );

    await act(async () => {
      await result.current.handleFileSelect(file);
    });
    expect(result.current.pendingFile).not.toBeNull();

    act(() => {
      result.current.clearFile();
    });

    expect(result.current.pendingFile).toBeNull();
  });

  it("does nothing when filesSupport is null", async () => {
    const file = new File(["content"], "deck.pptx");

    const { result } = renderHook(() =>
      useFileUpload({ selectedToolKey: "extract", filesSupport: null })
    );

    await act(async () => {
      await result.current.handleFileSelect(file);
    });

    expect(result.current.pendingFile).toBeNull();
    expect(uploadFileModule.uploadFile).not.toHaveBeenCalled();
  });
});
