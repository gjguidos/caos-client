
import { Paperclip } from "lucide-react";

interface MessageAttachmentProps {
  filename: string;
}

/**
 * Displays the filename attached to a chat message.
 *
 * The filename is split into its base and extension,
 * ensuring that long names are truncated while the
 * extension remains visible.
 */
export function MessageAttachment({
  filename,
}: Readonly<MessageAttachmentProps>) {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot) : "";

  return (
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
      <Paperclip
        className="size-3 shrink-0"
        aria-hidden="true"
      />

      <span
        className="flex min-w-0 text-xs"
        title={filename}
      >
        <span className="min-w-0 truncate">
          {base}
        </span>

        <span className="shrink-0">
          {extension}
        </span>
      </span>
    </div>
  );
}
