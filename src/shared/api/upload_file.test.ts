import { beforeEach, describe, expect, it, vi } from "vitest";
import * as getApiClient from "@/shared/lib/getApiClient";
import { uploadFile } from "./upload_file";

vi.mock("@/shared/lib/getApiClient");

const MOCK_FILE_REF = {
  file_id: "f_abc123",
  name: "test.pptx",
  mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  size: 1024,
  sha256: "abc123",
};

describe("uploadFile", () => {
  const FILE = new File(["hello"], "test.pptx", {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const TOKEN = "mock-bearer-token";

  let xhrMock: {
    open: ReturnType<typeof vi.fn>;
    setRequestHeader: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    onload: (() => void) | null;
    onerror: (() => void) | null;
    status: number;
    responseText: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getApiClient.getPublicApiBase).mockReturnValue(
      "https://api.example.com"
    );

    xhrMock = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
      onload: null,
      onerror: null,
      status: 201,
      responseText: JSON.stringify({ data: MOCK_FILE_REF }),
    };

    vi.spyOn(globalThis, "XMLHttpRequest" as any).mockImplementation(
      function () {
        return xhrMock;
      }
    );
  });

  it("opens POST to /api/v1/files with Authorization header", async () => {
    const promise = uploadFile(FILE, { targetTool: "extract" }, TOKEN);
    xhrMock.onload!();
    await promise;

    expect(xhrMock.open).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining("/v1/files")
    );
    expect(xhrMock.setRequestHeader).toHaveBeenCalledWith(
      "Authorization",
      `Bearer ${TOKEN}`
    );
  });

  it("sends FormData with file and target_tool for a tool target", async () => {
    let captured: FormData | null = null;
    xhrMock.send = vi.fn((fd: FormData) => {
      captured = fd;
    });

    const promise = uploadFile(FILE, { targetTool: "extract" }, TOKEN);
    xhrMock.onload!();
    await promise;

    expect(captured).not.toBeNull();
    expect(captured!.get("file")).toEqual(FILE);
    expect(captured!.get("target_tool")).toBe("extract");
    expect(captured!.get("target_workflow")).toBeNull();
  });

  it("sends FormData with target_workflow for a workflow target", async () => {
    let captured: FormData | null = null;
    xhrMock.send = vi.fn((fd: FormData) => {
      captured = fd;
    });

    const promise = uploadFile(FILE, { targetWorkflow: "wf_report" }, TOKEN);
    xhrMock.onload!();
    await promise;

    expect(captured).not.toBeNull();
    expect(captured!.get("file")).toEqual(FILE);
    expect(captured!.get("target_workflow")).toBe("wf_report");
    expect(captured!.get("target_tool")).toBeNull();
  });

  it("returns FileRef on 2xx response", async () => {
    const promise = uploadFile(FILE, { targetTool: "extract" }, TOKEN);
    xhrMock.onload!();
    const result = await promise;

    expect(result).toEqual(MOCK_FILE_REF);
  });

  it("rejects on non-2xx status", async () => {
    xhrMock.status = 422;
    xhrMock.responseText = JSON.stringify({
      message: "MIME type not accepted",
    });

    const promise = uploadFile(FILE, { targetTool: "extract" }, TOKEN);
    xhrMock.onload!();

    await expect(promise).rejects.toThrow("MIME type not accepted");
  });

  it("rejects on network error", async () => {
    const promise = uploadFile(FILE, { targetTool: "extract" }, TOKEN);
    xhrMock.onerror!();

    await expect(promise).rejects.toThrow("File upload failed");
  });
});
