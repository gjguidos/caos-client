import Image from "next/image";
import Link from "next/link";

type VAOSLogoProps = {
  width?: number;
  height?: number;
  /**
   * Free zone size as percentage of logo height
   * - "default": 100% of logo height (standard spacing)
   * - "compact": 25% of logo height (for small digital spaces)
   * @default "default"
   *
   * Note: The free zone is returned as a style object for parent containers.
   * The logo itself does not apply padding—this ensures proper spacing control.
   */
  freeZone?: "default" | "compact";
  linkToHome?: boolean;
  className?: string;
};

/**
 * CAOS Logo Component
 *
 * Implements CAOS brand guidelines for logo spacing:
 * - Default free zone: 100% of logo height (24px for default size)
 * - Compact free zone: 25% of logo height (6px for default size)
 *
 * The free zone is the minimum clear space that should exist around the logo.
 * Use margin/padding on parent containers to enforce this spacing.
 */
export default function VAOSLogo({
  width = 100,
  height = 40,
  freeZone = "default",
  linkToHome = true,
  className = "",
}: VAOSLogoProps) {
  // Calculate free zone spacing for reference (parent should apply this)
  const freeZonePercentage = freeZone === "default" ? 100 : 25;
  const freeZoneSize = (height * freeZonePercentage) / 100;

  // The SVG viewBox is "0 0 100 40", so the natural aspect ratio is 0.4.
  // Tailwind's preflight applies `height: auto` to all images, so the rendered
  // height is always proportional to width. We must pass the matching natural
  // height as the HTML attribute so Next.js's dimension-mismatch check passes.
  const naturalHeight = Math.round(width * 0.4);

  const logoImage = (
    <Image
      src="/CAOS-logo.png"
      alt="CAOS Logo"
      width={width}
      height={naturalHeight}
      style={{ width: `${width}px`, height: `${naturalHeight}px` }}
      className={`rounded-none ${className}`}
      priority
    />
  );

  if (linkToHome) {
    return (
      <Link
        href="/"
        className="inline-block rounded transition-opacity"
        style={
          {
            "--CAOS-free-zone": `${freeZoneSize}px`,
          } as React.CSSProperties
        }
        aria-label="Go to home"
      >
        {logoImage}
      </Link>
    );
  }

  return (
    <div
      className="inline-block"
      style={
        {
          "--CAOS-free-zone": `${freeZoneSize}px`,
        } as React.CSSProperties
      }
      aria-label="CAOS"
    >
      {logoImage}
    </div>
  );
}

/**
 * Helper to get the required free zone spacing
 * Use this when you need to apply spacing in parent containers
 */
export function getVAOSFreeZone(
  logoHeight: number,
  mode: "default" | "compact" = "default"
): number {
  const percentage = mode === "default" ? 100 : 25;
  return (logoHeight * percentage) / 100;
}
