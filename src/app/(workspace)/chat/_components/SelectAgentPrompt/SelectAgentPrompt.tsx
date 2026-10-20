
import { MessagesSquare } from "lucide-react";

interface SelectAgentPromptProps {
  title?: string;
  description?: string;
}

export function SelectAgentPrompt({
  title = "Select an Agent",
  description = "Choose an agent from the sidebar to start a conversation",
}: SelectAgentPromptProps) {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <MessagesSquare
          className="mb-8 size-16 text-muted-foreground/50"
          strokeWidth={1.5}
          aria-hidden="true"
        />

        <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        <p className="text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
