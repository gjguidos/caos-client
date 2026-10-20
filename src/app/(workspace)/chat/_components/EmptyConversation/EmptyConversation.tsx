
"use client";

import { usePersonalityDescription } from "../../_hooks/usePersonalityDescription";

interface EmptyConversationProps {
  agentName: string;
  personalityKey: string | undefined;
}

/**
 * What a conversation shows before it has anything in it:
 * an invitation and a description of the agent's personality.
 *
 * The personality lookup stays here so populated conversations
 * do not fetch descriptions they will never display.
 */
export function EmptyConversation({
  agentName,
  personalityKey,
}: Readonly<EmptyConversationProps>) {
  const description = usePersonalityDescription(personalityKey);

  return (
    <div className="flex h-full items-end justify-center pb-8 text-center">
      <div className="flex max-w-2xl flex-col items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Ask {agentName} anything
        </h2>

        {description && (
          <p className="max-w-prose text-balance text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
