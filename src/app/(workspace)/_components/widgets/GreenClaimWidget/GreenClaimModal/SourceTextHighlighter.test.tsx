import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SourceTextHighlighter,
  type HighlightRange,
} from "./SourceTextHighlighter";

describe("SourceTextHighlighter", () => {
  it("renders plain text without highlights", () => {
    const text = "This is plain text without any highlights.";
    render(
      <SourceTextHighlighter
        text={text}
        highlights={[]}
        activeStatementId={null}
      />
    );

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("renders text with a single highlight", () => {
    const text = "This is a test with one highlight.";
    const highlights: HighlightRange[] = [
      { start: 10, end: 14, statementId: "statement-1" },
    ];

    const { container } = render(
      <SourceTextHighlighter
        text={text}
        highlights={highlights}
        activeStatementId={null}
      />
    );

    // Check that "test" is highlighted
    const highlightedSpan = container.querySelector(
      '[data-statement-id="statement-1"]'
    );
    expect(highlightedSpan).toBeInTheDocument();
    expect(highlightedSpan?.textContent).toBe("test");
  });

  it("renders text with multiple highlights", () => {
    const text = "First highlight and second highlight.";
    const highlights: HighlightRange[] = [
      { start: 0, end: 5, statementId: "statement-1" },
      { start: 20, end: 26, statementId: "statement-2" },
    ];

    const { container } = render(
      <SourceTextHighlighter
        text={text}
        highlights={highlights}
        activeStatementId={null}
      />
    );

    const highlight1 = container.querySelector(
      '[data-statement-id="statement-1"]'
    );
    const highlight2 = container.querySelector(
      '[data-statement-id="statement-2"]'
    );

    expect(highlight1?.textContent).toBe("First");
    expect(highlight2?.textContent).toBe("second");
  });

  it("applies active styling to the hovered statement", () => {
    const text = "This is a test.";
    const highlights: HighlightRange[] = [
      { start: 10, end: 14, statementId: "statement-1" },
    ];

    const { container } = render(
      <SourceTextHighlighter
        text={text}
        highlights={highlights}
        activeStatementId="statement-1"
      />
    );

    const highlightedSpan = container.querySelector(
      '[data-statement-id="statement-1"]'
    );
    expect(highlightedSpan?.className).toContain("bg-yellow-300");
    expect(highlightedSpan?.className).toContain("ring-2");
  });

  it("applies inactive styling to non-hovered statements", () => {
    const text = "First and second.";
    const highlights: HighlightRange[] = [
      { start: 0, end: 5, statementId: "statement-1" },
      { start: 10, end: 16, statementId: "statement-2" },
    ];

    const { container } = render(
      <SourceTextHighlighter
        text={text}
        highlights={highlights}
        activeStatementId="statement-1"
      />
    );

    const inactiveSpan = container.querySelector(
      '[data-statement-id="statement-2"]'
    );
    expect(inactiveSpan?.className).toContain("bg-yellow-100");
    expect(inactiveSpan?.className).not.toContain("ring-2");
  });

  it("handles adjacent highlights correctly", () => {
    const text = "FirstSecond";
    const highlights: HighlightRange[] = [
      { start: 0, end: 5, statementId: "statement-1" },
      { start: 5, end: 11, statementId: "statement-2" },
    ];

    const { container } = render(
      <SourceTextHighlighter
        text={text}
        highlights={highlights}
        activeStatementId={null}
      />
    );

    const highlight1 = container.querySelector(
      '[data-statement-id="statement-1"]'
    );
    const highlight2 = container.querySelector(
      '[data-statement-id="statement-2"]'
    );

    expect(highlight1?.textContent).toBe("First");
    expect(highlight2?.textContent).toBe("Second");
  });

  it("handles empty text gracefully", () => {
    const { container } = render(
      <SourceTextHighlighter text="" highlights={[]} activeStatementId={null} />
    );

    // Should render without crashing
    expect(container.querySelector(".whitespace-pre-wrap")).toBeInTheDocument();
  });
});
