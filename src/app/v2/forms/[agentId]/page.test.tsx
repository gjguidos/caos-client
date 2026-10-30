import { render, screen } from "@/test-utils/test-utils";
import { expect, it, vi } from "vitest";
import { fetchAgentById } from "@/shared/api/fetch_agents";
import FormAgentPage from "./page";
import { presentationFixture } from "@/shared/lib/enki/draft.fixture";

vi.mock("@/shared/hooks/useWorkflowCatalog", () => ({
  useWorkflowCatalog: () => ({ status: "ready", entries: [] }),
}));

vi.mock("@/shared/api/fetch_agents", () => ({ fetchAgentById: vi.fn() }));

it("rejects malformed identities before contacting the definition API", async () => {
  vi.mocked(fetchAgentById).mockClear();
  render(
    await FormAgentPage({ params: Promise.resolve({ agentId: "../invalid" }) })
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Invalid Agent identity");
  expect(fetchAgentById).not.toHaveBeenCalled();
});

it("opens the explicitly V2 form/enki definition via authenticated read only", async () => {
  vi.mocked(fetchAgentById).mockResolvedValue({
    success: true,
    data: {
      id: "enki",
      name: "Enki",
      type: "form",
      role_name: "enki",
      runtime_version: "v2",
      effective_gui_components: [
        {
          type: "form",
          key: "configuration",
          version: 1,
          default: true,
          config: {
            source: {
              kind: "contract",
              contract: "caos.agent_creation_draft",
              schema_version: 1,
            },
          },
        },
      ],
      form_presentations: { configuration: presentationFixture },
    },
  });
  render(await FormAgentPage({ params: Promise.resolve({ agentId: "enki" }) }));
  expect(
    screen.getByRole("heading", { name: /Enki.*Agent configuration draft/ })
  ).toBeVisible();
  expect(fetchAgentById).toHaveBeenCalledWith("enki");
});

it.each([
  { type: "chat", role_name: "general", runtime_version: "v2" },
  { type: "form", role_name: "crawler", runtime_version: "v2" },
  { type: "form", role_name: "enki", runtime_version: "v1" },
])(
  "does not fall back to a V1 form or grant a form workspace for %j",
  async (definition) => {
    vi.mocked(fetchAgentById).mockResolvedValue({
      success: true,
      data: { id: "enki", name: "Enki", ...definition },
    });
    render(
      await FormAgentPage({ params: Promise.resolve({ agentId: "enki" }) })
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Prepare preview" })
    ).not.toBeInTheDocument();
  }
);
