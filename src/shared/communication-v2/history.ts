export type TranscriptMessage = {
  id: string;
  sequence: number;
  event_id: string;
  participant_id: string;
  kind:
    | "user_message"
    | "agent_response"
    | "capability_contribution"
    | "internal_event";
  content: string;
  capability: string | null;
  outcome: string;
};
export type HistoryPage = {
  messages: TranscriptMessage[];
  next_cursor: string | null;
};
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[\w-]{1,128}$/.test(value);

/** Validate and whitelist canonical rows; never manufacture messages from context. */
export function readHistory(value: unknown): HistoryPage {
  const data = value as HistoryPage | null;
  if (
    !data ||
    !Array.isArray(data.messages) ||
    data.messages.length > 100 ||
    !(
      data.next_cursor === null ||
      (typeof data.next_cursor === "string" && data.next_cursor.length <= 512)
    )
  )
    throw new Error("Invalid history response");
  let previous = 0;
  const ids = new Set<string>();
  const messages = data.messages.map((m) => {
    if (
      !identifier(m.id) ||
      !identifier(m.event_id) ||
      !identifier(m.participant_id) ||
      !Number.isSafeInteger(m.sequence) ||
      m.sequence <= previous ||
      ids.has(m.id) ||
      ![
        "user_message",
        "agent_response",
        "capability_contribution",
        "internal_event",
      ].includes(m.kind) ||
      typeof m.content !== "string" ||
      m.content.length > 65536 ||
      typeof m.outcome !== "string" ||
      (m.kind === "capability_contribution"
        ? typeof m.capability !== "string" || !m.capability
        : m.capability !== null)
    )
      throw new Error("Invalid transcript message");
    previous = m.sequence;
    ids.add(m.id);
    return {
      id: m.id,
      sequence: m.sequence,
      event_id: m.event_id,
      participant_id: m.participant_id,
      kind: m.kind,
      content: m.content,
      capability: m.capability,
      outcome: m.outcome,
    };
  });
  return { messages, next_cursor: data.next_cursor };
}
