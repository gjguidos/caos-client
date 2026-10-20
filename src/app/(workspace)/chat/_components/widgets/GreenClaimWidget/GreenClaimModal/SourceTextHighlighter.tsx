import { cn } from "@/shared/lib/utils";
import { useEffect, useRef } from "react";

export interface HighlightRange {
  start: number;
  end: number;
  statementId: string; // For identifying which statement to link to
}

export interface SourceTextHighlighterProps {
  text: string;
  highlights: HighlightRange[];
  activeStatementId: string | null; // Currently hovered/clicked statement
  scrollToStatementId?: string | null;
  className?: string;
}

interface TextSegment {
  text: string;
  isHighlighted: boolean;
  statementId?: string;
  isActive: boolean;
}

/**
 * Parses text into segments based on highlight ranges
 */
function parseTextSegments(
  text: string,
  highlights: HighlightRange[],
  activeStatementId: string | null
): TextSegment[] {
  if (highlights.length === 0) {
    return [{ text, isHighlighted: false, isActive: false }];
  }

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let currentPosition = 0;

  for (const highlight of sortedHighlights) {
    // Skip ranges that overlap with the previous highlight
    if (highlight.start < currentPosition) {
      continue;
    }

    // Add plain text before this highlight
    if (currentPosition < highlight.start) {
      segments.push({
        text: text.slice(currentPosition, highlight.start),
        isHighlighted: false,
        isActive: false,
      });
    }

    // Add highlighted text
    segments.push({
      text: text.slice(highlight.start, highlight.end),
      isHighlighted: true,
      statementId: highlight.statementId,
      isActive: highlight.statementId === activeStatementId,
    });

    currentPosition = highlight.end;
  }

  // Add remaining plain text after last highlight
  if (currentPosition < text.length) {
    segments.push({
      text: text.slice(currentPosition),
      isHighlighted: false,
      isActive: false,
    });
  }

  return segments;
}

export function SourceTextHighlighter({
  text,
  highlights,
  activeStatementId,
  scrollToStatementId,
  className,
}: SourceTextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = parseTextSegments(text, highlights, activeStatementId);

  useEffect(() => {
    if (!scrollToStatementId || !containerRef.current) return;
    const target = containerRef.current.querySelector<HTMLElement>(
      `[data-statement-id="${scrollToStatementId}"]`
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToStatementId]);

  return (
    <div
      ref={containerRef}
      className={cn("whitespace-pre-wrap font-mono text-sm", className)}
    >
      {segments.map((segment, index) => {
        if (!segment.isHighlighted) {
          return <span key={index}>{segment.text}</span>;
        }

        return (
          <span
            key={index}
            className={cn(
              "transition-colors duration-200",
              segment.isActive
                ? "bg-yellow-300 ring-2 ring-yellow-500 dark:bg-yellow-700/50"
                : "bg-yellow-100 dark:bg-yellow-900/30"
            )}
            data-statement-id={segment.statementId}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
}
