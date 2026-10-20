import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildArtifactFilename,
  downloadJson,
  downloadText,
  downloadUrl,
  extensionForMime,
  safeFilenameSegment,
} from "./download";

describe("safeFilenameSegment", () => {
  it("replaces unsafe runs with a single dash and trims the edges", () => {
    expect(safeFilenameSegment("Brief Writer / v2")).toBe("Brief-Writer-v2");
    expect(safeFilenameSegment("__ok__")).toBe("__ok__");
    expect(safeFilenameSegment("//lead//")).toBe("lead");
  });
});

describe("buildArtifactFilename", () => {
  it("joins workflow, truncated run id and step", () => {
    expect(
      buildArtifactFilename({
        workflowKey: "brief_writer",
        runId: "wf_1780659762095424680",
        parts: ["write"],
        extension: "txt",
      })
    ).toBe("brief_writer-wf_17806-write.txt");
  });

  it("skips missing parts", () => {
    expect(buildArtifactFilename({ parts: ["write"], extension: "json" })).toBe(
      "write.json"
    );
  });

  it("joins every part that identifies the artifact within a step", () => {
    expect(
      buildArtifactFilename({
        parts: ["draw", "Hero Image", "2"],
        extension: "png",
      })
    ).toBe("draw-Hero-Image-2.png");
  });

  it("falls back to a generic stem when nothing identifies the artifact", () => {
    expect(buildArtifactFilename({ extension: "json" })).toBe("output.json");
  });
});

describe("extensionForMime", () => {
  it("maps common image mimes", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/svg+xml")).toBe("svg");
    expect(extensionForMime("image/webp;charset=binary")).toBe("webp");
  });

  it("defaults to png when the mime is missing or unusable", () => {
    expect(extensionForMime()).toBe("png");
    expect(extensionForMime("image/")).toBe("png");
  });
});

describe("download helpers", () => {
  const clicks: Array<{ href: string; download: string }> = [];
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clicks.length = 0;
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicks.push({ href: this.href, download: this.download });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads text through an object URL and revokes it", async () => {
    downloadText("hello", "note.txt");

    expect(clicks).toEqual([{ href: "blob:mock-url", download: "note.txt" }]);
    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/plain;charset=utf-8");
    await expect(blob.text()).resolves.toBe("hello");

    await vi.waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
    );
  });

  it("serializes JSON with indentation", async () => {
    downloadJson({ a: 1 }, "bundle.json");

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/json;charset=utf-8");
    await expect(blob.text()).resolves.toBe('{\n  "a": 1\n}');
  });

  it("downloads a data URL directly, without creating an object URL", () => {
    downloadUrl("data:image/png;base64,iVBORw0", "chart.png");

    expect(clicks).toEqual([
      { href: "data:image/png;base64,iVBORw0", download: "chart.png" },
    ]);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("leaves no anchor behind in the document", () => {
    downloadText("hello", "note.txt");
    expect(document.querySelectorAll("a")).toHaveLength(0);
  });
});
