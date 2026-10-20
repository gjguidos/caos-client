import type { ChatMsg } from "@/app/(workspace)/_types/chat.types";

/**
 * What plain conversation is called, where a tool would otherwise be named.
 *
 * Naming it after the agent would repeat a fact the page header and the rail
 * already state, on every single message.
 */
export const PLAIN_CHAT_SOURCE = "Chat";

export interface MessageOrigin {
  /** What the message went through: the tool it was sent with, or plain chat. */
  source: string;
  /** What was asked to produce it, for widgets that show the input alongside
   * their analysis of it. The prompt rather than the command it was sent as, so
   * a widget gets the text itself and not flags wrapped around it. Absent when
   * nothing precedes the message. */
  requestText?: string;
}

/**
 * Where each message in a transcript came from, by position.
 *
 * A response belongs to the request above it, so a request sent through a tool
 * and the answer to it are named the same way - which is the one thing that
 * varies down a conversation, and the only reason to head a message at all.
 *
 * The request in effect is running state of the transcript, so one forward pass
 * answers this for every message - rather than each message searching backwards
 * for the request it belongs to.
 */
export function messageOrigins(messages: ChatMsg[]): MessageOrigin[] {
  let origin: MessageOrigin = { source: PLAIN_CHAT_SOURCE };
  return messages.map((message) => {
    if (message.sender === "user") {
      origin = {
        source: message.toolDisplay?.toolName ?? PLAIN_CHAT_SOURCE,
        // An invocation with no chat input has no prompt to hand on; its raw
        // command is the only record of what was asked.
        requestText: message.toolDisplay?.prompt ?? message.text,
      };
    }
    return origin;
  });
}
