
interface AgentSummaryHeaderProps {
  name: string;
  description: string | undefined;
}

/**
 * The agent's name and purpose.
 *
 * This is the visible heading of the agent details panel.
 * The dialog itself uses a visually hidden accessible title,
 * avoiding duplicate visible headings.
 */
export function AgentSummaryHeader({
  name,
  description,
}: Readonly<AgentSummaryHeaderProps>) {
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-6">
      <h2
        id="agent-details-modal-title"
        className="text-2xl font-semibold tracking-tight text-foreground"
      >
        {name}
      </h2>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {description?.trim() || "No description available."}
      </p>
    </header>
  );
}
