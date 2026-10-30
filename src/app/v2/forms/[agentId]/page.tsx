import { fetchAgentById } from "@/shared/api/fetch_agents";
import {
  formAgentDescriptorSchema,
  presentationSchema,
  DRAFT_CONTRACT,
} from "@/shared/lib/enki/draft";
import { DraftWorkspace } from "./DraftWorkspace";

export default async function FormAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  if (!formAgentDescriptorSchema.shape.id.safeParse(agentId).success) {
    return (
      <main className="p-6">
        <p role="alert">Invalid Agent identity.</p>
      </main>
    );
  }
  // Reuse the existing authenticated, read-only definition API. Never construct
  // a V1 runtime or command transport. Route parameters convey no authority.
  let response;
  try {
    response = await fetchAgentById(agentId);
  } catch {
    return (
      <main className="p-6">
        <p role="alert">Agent definition unavailable.</p>
      </main>
    );
  }
  const descriptor = formAgentDescriptorSchema.safeParse(
    response?.success ? response.data : null
  );
  const agent = descriptor.success ? descriptor.data : null;
  const components = agent?.effective_gui_components ?? [];
  const primary = components.filter((component) => component.default);
  const component = primary.length === 1 ? primary[0] : undefined;
  const source = component?.config.source;
  const presentation = presentationSchema.safeParse(
    agent?.form_presentations?.[component?.key ?? ""]
  );
  if (
    !agent ||
    agent.id !== agentId ||
    component?.type !== "form" ||
    component.version !== 1 ||
    source?.kind !== "contract" ||
    source.contract !== DRAFT_CONTRACT ||
    source.schema_version !== 1 ||
    !presentation.success
  ) {
    return (
      <main className="p-6">
        <p role="alert" className="text-destructive">
          This Agent interface or presentation version is unsupported. No
          conversation or execution was started.
        </p>
      </main>
    );
  }
  return (
    <DraftWorkspace
      key={agentId}
      agentId={agentId}
      name={agent.name}
      presentation={presentation.data}
      persistence="server"
      canConverse={components.some(
        (item) => item.type === "chat" && item.version === 1
      )}
    />
  );
}
