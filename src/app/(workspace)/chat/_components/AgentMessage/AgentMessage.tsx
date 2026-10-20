"use client";

import { Eyebrow } from "@/shared/components/Eyebrow/Eyebrow";
import type { ReactNode } from "react";

interface AgentMessageProps {
  /**
   * What produced the message - the tool it was requested through, or plain
   * chat. An unnamed source goes unattributed rather than headed with a blank.
   */
  source: string;
  children: ReactNode;
}

/**
 * One turn from the agent, whatever it turns out to contain.
 *
 * Attribution belongs to the message rather than to the bubble inside it: a
 * report widget is as much "something the agent said" as a paragraph is, and
 * used to arrive with nothing naming it while the text above it was headed.
 * Anything rendered in here is named the same way without having to remember to.
 *
 * Acting on the message stays with whatever is inside: what "copy" means
 * differs between a paragraph and a report.
 */
export function AgentMessage({
  source,
  children,
}: Readonly<AgentMessageProps>) {
  return (
    <div className="my-100 text-left">
      {source && <Eyebrow className="mb-25">{source} output</Eyebrow>}
      <div className="space-y-75">{children}</div>
    </div>
  );
}
