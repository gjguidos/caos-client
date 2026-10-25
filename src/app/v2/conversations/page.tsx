import { ConversationWorkspace } from "./_components/Workspace";
export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; agent?: string }>;
}) {
  const params = await searchParams;
  return (
    <ConversationWorkspace
      initialAgentId={typeof params.agent === "string" ? params.agent : ""}
      initialId={
        typeof params.conversation === "string" ? params.conversation : ""
      }
    />
  );
}
