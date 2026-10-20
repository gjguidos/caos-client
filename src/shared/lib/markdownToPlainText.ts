/**
 * Converts markdown text to plain text by removing formatting markers.
 * Preserves the text content while stripping markdown syntax.
 */
export function markdownToPlainText(markdown: string): string {
  return (
    markdown
      // Convert headers to uppercase with spacing
      .replace(/^#{1,2}\s+(.+)$/gm, (_, text) => `\n${text.toUpperCase()}\n`)
      .replace(/^#{3,6}\s+(.+)$/gm, (_, text) => `\n${text}\n`)
      // Remove bold/italic markers but keep text
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // Remove strikethrough markers
      .replace(/~~(.*?)~~/g, "$1")
      // Convert links to just the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove code backticks but keep content
      .replace(/```[\s\S]*?```/g, (match) =>
        match.replace(/```\w*\n?/g, "").trim()
      )
      .replace(/`([^`]+)`/g, "$1")
      // Keep list markers (convert * and + to -)
      .replace(/^[*+]\s+/gm, "- ")
      // Keep blockquotes readable
      .replace(/^>\s+/gm, "  ")
      // Clean up excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
