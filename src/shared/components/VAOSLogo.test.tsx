import { render, screen } from "@/test-utils/test-utils";
import VAOSLogo, { getVAOSFreeZone } from "./VAOSLogo";

describe("VAOSLogo", () => {
  it("renders the CAOS logo", () => {
    render(<VAOSLogo />);
    const logo = screen.getByAltText("CAOS Logo");
    expect(logo).toBeInTheDocument();
  });

  it("wraps the logo in a link by default", () => {
    render(<VAOSLogo />);
    const link = screen.getByLabelText("Go to home");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });

  it("does not wrap the logo in a link when linkToHome is false", () => {
    render(<VAOSLogo linkToHome={false} />);
    const link = screen.queryByLabelText("Go to home");
    expect(link).not.toBeInTheDocument();

    const div = screen.getByLabelText("CAOS");
    expect(div).toBeInTheDocument();
  });

  it("renders an Image with the correct props", () => {
    render(<VAOSLogo width={120} height={30} />);
    const image = screen.getByAltText("CAOS Logo");
    expect(image).toHaveAttribute("src", "/CAOS-logo.svg");
    expect(image).toHaveAttribute("width", "120");
    // Height attribute reflects the SVG's natural aspect ratio (viewBox 0 0 100 40 = 0.4)
    // to match the CSS-computed height and avoid the Next.js dimension-mismatch warning.
    expect(image).toHaveAttribute("height", "48"); // Math.round(120 * 0.4)
  });
});

describe("getVAOSFreeZone", () => {
  it("calculates default free zone correctly", () => {
    expect(getVAOSFreeZone(24, "default")).toBe(24);
  });

  it("calculates compact free zone correctly", () => {
    expect(getVAOSFreeZone(24, "compact")).toBe(6);
  });

  it('defaults to "default" mode', () => {
    expect(getVAOSFreeZone(30)).toBe(30);
  });
});
