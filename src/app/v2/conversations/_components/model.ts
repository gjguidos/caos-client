export type Conversation = { id: string; agent_ids: string[] };
export const validId = (id: unknown): id is string =>
  typeof id === "string" && /^[\w-]{1,128}$/.test(id);
export function readConversation(value: unknown): Conversation {
  const data = value as Conversation | null;
  if (
    !data ||
    !validId(data.id) ||
    !Array.isArray(data.agent_ids) ||
    !data.agent_ids.length ||
    !data.agent_ids.every((id) => typeof id === "string" && validId(id))
  )
    throw new Error("Invalid conversation response");
  return { id: data.id, agent_ids: data.agent_ids };
}
export const recentKey = (user: string) =>
  `caos:v2:recent:${encodeURIComponent(user)}`;
export function readRecent(user: string): string[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem(recentKey(user)) || "[]"
    );
    return Array.isArray(data)
      ? data
          .filter((id): id is string => typeof id === "string" && validId(id))
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export function remember(user: string, id: string): string[] {
  const ids = [id, ...readRecent(user).filter((value) => value !== id)].slice(
    0,
    20
  );
  try {
    localStorage.setItem(recentKey(user), JSON.stringify(ids));
  } catch {
    /* IDs can still be copied when browser storage is disabled. */
  }
  return ids;
}
