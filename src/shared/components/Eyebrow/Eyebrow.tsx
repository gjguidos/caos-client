
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

interface EyebrowProps {
  children: ReactNode;
  className?: string;

  /**
   * Caption: compact label for messages and panels.
   * Section: slightly larger label for page and section headers.
   */
  size?: "caption" | "section";

  /**
   * Controls the semantic HTML element independently
   * of the visual styling.
   */
  tagName?: "p" | "h2";
}

/**
 * A small label identifying the content below it.
 *
 * Used for:
 * - Tool names
 * - Agent identifiers
 * - Message labels
 * - Panel and section headings
 *
 * Both sizes share uppercase typography, wider
 * letter spacing, and muted foreground colors.
 */
export function Eyebrow({
  children,
  className,
  size = "caption",
  tagName: Tag = "p",
}: Readonly<EyebrowProps>) {
  return (
    <Tag
      className={cn(
        "uppercase tracking-[0.08em] text-muted-foreground",
        size === "section"
          ? "text-sm font-medium"
          : "text-xs font-bold",
        className
      )}
    >
      {children}
    </Tag>
  );
}
