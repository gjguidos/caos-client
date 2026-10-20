"use client";

import { Paperclip } from "lucide-react";
import { CopyButton } from "@/shared/components/CopyButton/CopyButton";
import { Eyebrow } from "@/shared/components/Eyebrow/Eyebrow";
import { MessageBubble } from "@/app/(workspace)/_components/MessageBubble/MessageBubble";
import { ToolSettingsDisclosure } from "./ToolSettingsDisclosure";
import type { ChatMsg } from "@/app/(workspace)/_types/chat.types";

interface PromptBubbleProps {
  message: ChatMsg;
  /** What the message was sent through - the tool, or plain chat. Named the
   * same way the answer to it is, so a turn reads as one exchange. */
  source: string;
}

export function PromptBubble({ message, source }: PromptBubbleProps) {
  const { attachment, toolDisplay } = message;
  // "extracted" attachments store the raw PDF text in message.text — show only
  // the filename pill, not the text block. "ref" attachments carry a real user
  // message alongside the uploaded file, so show both.
  const showText = !attachment || attachment.kind === "ref";

  // A tool invocation is still a message you sent, so it wears the same bubble
  // as any other - the tool name above it and its flags folded underneath,
  // rather than a card that breaks the run of the conversation. An invocation
  // that carried neither text nor flags has nothing to put in a bubble.
  const body = toolDisplay ? (toolDisplay.prompt ?? "") : message.text;
  const settings = toolDisplay?.fields ?? [];
  const hasBubble = !!body || settings.length > 0;

  return (
    <div>
      {attachment && (
        <div className="mb-1 flex justify-end">
          <div className="inline-flex items-center gap-1.5 rounded-[12px] bg-neutral-2 px-4 py-2 text-sm text-text-2">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[200px] truncate">
              {attachment.filename}
            </span>
          </div>
        </div>
      )}
      {showText && hasBubble && (
        <MessageBubble
          text={body}
          align="right"
          header={source && <Eyebrow className="mb-25">{source}</Eyebrow>}
          footer={
            settings.length > 0 && <ToolSettingsDisclosure fields={settings} />
          }
          actions={
            <CopyButton
              value={message.text}
              label="message"
              className="text-neutral-5"
            />
          }
        />
      )}
    </div>
  );
}
