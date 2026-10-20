import { render, screen, userEvent } from "@/test-utils/test-utils";
import {
  declaredImage,
  declaredValue,
  presentedImage,
  presentedOutput,
} from "@/test-utils/workflow-fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepArtifactProvider } from "./RunArtifactContext";
import { OutputDisplay } from "./StepOutput";

/**
 * A step's own output, where its images are artifacts of the run.
 *
 * Rendering bare `OutputDisplay` is the other case: the same value shown as a
 * downstream step's resolved input, which offers no download.
 */
function renderStepOutput(value: unknown, stepId: string) {
  return render(
    <StepArtifactProvider stepId={stepId}>
      <OutputDisplay value={value} />
    </StepArtifactProvider>
  );
}

/** Captures what a download would have written, without leaving jsdom. */
function stubDownloads() {
  const downloads: { href: string; filename: string }[] = [];
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ href: this.href, filename: this.download });
    });
  return { downloads, restore: () => click.mockRestore() };
}

/** What `user.setup()`'s clipboard stub was handed. */
function clipboardText() {
  return navigator.clipboard.readText();
}

describe("OutputDisplay", () => {
  describe("a step that declares outputs", () => {
    const output = presentedOutput({
      text: "A sleek matte-black desk lamp",
      images: [presentedImage()],
      declared: {
        product_description: declaredValue(
          "Product Description",
          "A sleek matte-black desk lamp"
        ),
        hero_image: declaredImage("Hero Image", [0]),
      },
    });

    it("leads with the declared outputs under their labels", () => {
      render(<OutputDisplay value={output} />);

      expect(screen.getByText("Product Description")).toBeInTheDocument();
      expect(screen.getByText("Hero Image")).toBeInTheDocument();
    });

    it("resolves a declared image through its indexes", () => {
      render(<OutputDisplay value={output} />);

      expect(
        screen.getByRole("img", { name: "Hero Image" })
      ).toBeInTheDocument();
    });

    it("replaces the raw display fields rather than repeating them", () => {
      render(<OutputDisplay value={output} />);

      expect(screen.queryByText("Text")).not.toBeInTheDocument();
      expect(screen.queryByText("Images")).not.toBeInTheDocument();
      expect(screen.getAllByRole("img")).toHaveLength(1);
    });

    it("reports a declared image that produced nothing as absent", () => {
      render(
        <OutputDisplay
          value={presentedOutput({
            tool: "draw",
            declared: { hero_image: declaredImage("Hero Image", []) },
          })}
        />
      );

      expect(screen.getByText("No image produced")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("a step whose tool declares no outputs", () => {
    // `workflow` and `analyze` do this deliberately; the raw fields are all
    // they will ever have, so an empty declared map is normal, not a failure.
    const output = presentedOutput({ tool: "analyze", text: "Looks fine" });

    it("shows the raw fields directly, with no disclosure", () => {
      render(<OutputDisplay value={output} />);

      expect(screen.getByText("Text")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Show raw output" })
      ).not.toBeInTheDocument();
    });
  });

  it("renders a step's error alongside whatever it declared", () => {
    render(
      <OutputDisplay
        value={presentedOutput({ ok: false, error: "tool exploded" })}
      />
    );

    expect(screen.getByText("tool exploded")).toBeInTheDocument();
  });

  it("still pretty-prints a value that is not a presented output", () => {
    render(<OutputDisplay value={{ a: 1 }} />);
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });

  /**
   * Every value gets the affordance that actually delivers it: an image belongs
   * in a file, everything else on the clipboard.
   */
  describe("taking a value off the page", () => {
    let downloads: { href: string; filename: string }[];
    let restoreDownloads: () => void;

    beforeEach(() => {
      const stub = stubDownloads();
      downloads = stub.downloads;
      restoreDownloads = stub.restore;
    });

    afterEach(() => restoreDownloads());

    it("copies a declared value as the text the pane shows", async () => {
      const user = userEvent.setup();
      renderStepOutput(
        presentedOutput({
          declared: { score: declaredValue("Audit Score", 92, "number") },
        }),
        "audit"
      );

      await user.click(
        screen.getByRole("button", { name: "Copy Audit Score" })
      );

      await expect(clipboardText()).resolves.toBe("92");
    });

    it("confirms a copy on the button itself", async () => {
      const user = userEvent.setup();
      renderStepOutput(
        presentedOutput({
          declared: { note: declaredValue("Note", "ship it") },
        }),
        "review"
      );

      await user.click(screen.getByRole("button", { name: "Copy Note" }));

      expect(screen.getByRole("button", { name: "Copied!" })).toBeVisible();
    });

    it("downloads each image of a declared output separately", async () => {
      const user = userEvent.setup();
      renderStepOutput(
        presentedOutput({
          tool: "draw",
          images: [
            presentedImage("data:image/png;base64,one"),
            presentedImage("data:image/png;base64,two"),
          ],
          declared: { hero: declaredImage("Hero Image", [0, 1]) },
        }),
        "draw"
      );

      await user.click(
        screen.getByRole("button", { name: "Download Hero Image 2" })
      );

      expect(downloads).toEqual([
        {
          href: "data:image/png;base64,two",
          filename: "draw-Hero-Image-2.png",
        },
      ]);
    });

    it("leaves a lone image unnumbered, named for its own type", async () => {
      const user = userEvent.setup();
      renderStepOutput(
        presentedOutput({
          tool: "draw",
          images: [presentedImage("data:image/jpeg;base64,one", "image/jpeg")],
          declared: { hero: declaredImage("Hero Image", [0]) },
        }),
        "draw"
      );

      await user.click(
        screen.getByRole("button", { name: "Download Hero Image" })
      );

      expect(downloads[0].filename).toBe("draw-Hero-Image.jpg");
    });

    it("offers no copy on an image output", () => {
      renderStepOutput(
        presentedOutput({
          tool: "draw",
          images: [presentedImage()],
          declared: { hero: declaredImage("Hero Image", [0]) },
        }),
        "draw"
      );

      expect(
        screen.queryByRole("button", { name: "Copy Hero Image" })
      ).not.toBeInTheDocument();
    });

    it("treats the raw fields of an undeclaring tool the same way", () => {
      renderStepOutput(
        presentedOutput({
          tool: "analyze",
          text: "Looks fine",
          images: [presentedImage()],
        }),
        "check"
      );

      expect(
        screen.getByRole("button", { name: "Copy Text" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Download analyze output" })
      ).toBeInTheDocument();
    });

    it("lets a step's error be copied", async () => {
      const user = userEvent.setup();
      renderStepOutput(
        presentedOutput({ ok: false, error: "tool exploded" }),
        "draw"
      );

      await user.click(screen.getByRole("button", { name: "Copy Error" }));

      await expect(clipboardText()).resolves.toBe("tool exploded");
    });

    it("keeps a producer's image plain when it is shown as an input", () => {
      render(
        <OutputDisplay
          value={presentedOutput({
            tool: "draw",
            images: [presentedImage()],
            declared: { hero: declaredImage("Hero Image", [0]) },
          })}
        />
      );

      expect(screen.getByRole("img")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^Download/ })
      ).not.toBeInTheDocument();
    });
  });
});
