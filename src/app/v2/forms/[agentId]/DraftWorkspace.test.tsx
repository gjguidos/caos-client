import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test-utils/test-utils";
import { expect, it, vi } from "vitest";
import { DraftWorkspace, toolConfigurationFields } from "./DraftWorkspace";
import { presentationFixture } from "@/shared/lib/enki/draft.fixture";

vi.mock("@/shared/hooks/useWorkflowCatalog", () => ({
  useWorkflowCatalog: () => ({
    status: "ready",
    entries: [{ key: "flow", name: "Review flow" }],
  }),
}));

function setup(incompatible = false) {
  return render(
    <DraftWorkspace
      agentId="enki"
      name="Enki"
      presentation={presentationFixture}
      canConverse
    />,
    {
      preloadedState: {
        tools: {
          list: [
            {
              key: "configurable",
              name: "Configurable",
              description: "",
              version: "1",
              ui: {
                admin: {
                  fields: {
                    limit: {
                      key: "limit",
                      label: "Limit",
                      input: "number",
                      required: true,
                      constraints: { min: 1, max: 10 },
                    },
                  },
                },
              },
            },
          ],
        },
        agentTypes: {
          list: [
            {
              key: "chat",
              name: "Chat",
              metadata: { agent_group: "cognitive" },
            },
          ],
        },
        roles: {
          list: [
            {
              key: "general",
              name: "General",
              metadata: { agent_group: incompatible ? "other" : "cognitive" },
            },
          ],
        },
        souls: { list: [{ key: "empty_eva", name: "Empty", metadata: {} }] },
        rulepacks: { list: [{ key: "safe", name: "Safety", metadata: {} }] },
      },
    }
  );
}

it("shares a live canonical draft across Settings navigation, Tools and summary without submission", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const socketSpy = vi.spyOn(globalThis, "WebSocket");
  setup();
  fireEvent.change(screen.getByRole("textbox", { name: /Agent name/ }), {
    target: { value: "New Agent" },
  });
  expect(
    screen.getAllByRole("region", { name: "Configuration Summary" })[0]
  ).toHaveTextContent('"name": "New Agent"');
  expect(screen.getAllByLabelText("Validation feedback")[0]).toHaveTextContent(
    "prompt"
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Capabilities/ })[0]);
  fireEvent.click(screen.getByRole("checkbox", { name: "Configurable" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Limit/ }), {
    target: { value: "7" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "Review flow" }));
  expect(
    screen.getAllByRole("region", { name: "Configuration Summary" })[0]
  ).toHaveTextContent('"limit": 7');
  expect(
    screen.getAllByRole("region", { name: "Configuration Summary" })[0]
  ).toHaveTextContent('"flow"');
  fireEvent.click(screen.getAllByRole("button", { name: /Identity/ })[0]);
  expect(screen.getByRole("textbox", { name: /Agent name/ })).toHaveValue(
    "New Agent"
  );
  expect(screen.queryByText(/Step 1 of/)).not.toBeInTheDocument();
  for (const button of screen.getAllByRole("button", { name: "Create Agent" }))
    expect(button).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "Open conversation" })
  ).toHaveAttribute("href", "/v2/conversations?agent=enki");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(socketSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
  socketSpy.mockRestore();
});

it("reports local Tool constraint errors and resets the full draft", () => {
  setup();
  fireEvent.click(screen.getAllByRole("button", { name: /Capabilities/ })[0]);
  fireEvent.click(screen.getByRole("checkbox", { name: "Configurable" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Limit/ }), {
    target: { value: "99" },
  });
  expect(
    within(
      screen.getAllByRole("region", { name: "Configuration Summary" })[0]
    ).getByLabelText("Validation feedback")
  ).toHaveTextContent("between 1 and 10");
  fireEvent.click(screen.getByRole("button", { name: "Reset draft" }));
  expect(
    screen.getByRole("checkbox", { name: "Configurable" })
  ).not.toBeChecked();
});

it("only adapts Tool-owned Agent configuration, never invocation controls or effects", () => {
  const components = toolConfigurationFields({
    components: [{ id: "invoke" }],
    admin: {
      fields: {
        limit: { label: "Limit", input: "number" },
        action: { input: "action" },
        file: { input: "file" },
      },
    },
  });
  expect(components.map((component) => component.id)).toEqual(["limit"]);
});

it("uses each Tool's projected configuration schema, rather than invocation parameters", () => {
  const [field] = toolConfigurationFields(
    { admin: { fields: { limit: { label: "Limit", input: "number" } } } },
    {
      properties: { limit: { type: "integer", minimum: 2, maximum: 8 } },
      required: ["limit"],
    }
  );
  expect(field.props).toMatchObject({ min: 2, max: 8 });
  expect(field.flag_config?.required).toBe(true);
});

it("offers requester-registry selections and reports incompatible type/role combinations", () => {
  setup(true);
  fireEvent.keyDown(screen.getByRole("combobox", { name: /Agent type/ }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("option", { name: "Chat" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: /^Role/ }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("option", { name: "General" }));
  expect(screen.getAllByLabelText("Validation feedback")[0]).toHaveTextContent(
    "Role is incompatible with Agent type"
  );
});

it("shows authoritative server findings, requires explicit confirmation and keeps creation disabled", async () => {
  const digest = "d".repeat(64);
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json({
        contract: "caos.agent_creation_review",
        schema_version: 1,
        source_agent_id: "enki",
        validation: { valid: true, issues: [] },
        composition: {
          compatible: true,
          issues: [],
          preview: { name: "New Agent", runtime_version: "v2" },
        },
        eligibility: { eligible: true, reasons: [] },
        review_digest: digest,
        validated_at: "2026-10-30T09:00:00Z",
        expires_at: "2999-01-01T00:00:00Z",
        capability: { signal: "data.validation", version: "1.0.0" },
        authorizes: { creation: false, activation: false },
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        contract: "caos.agent_creation_review_approval",
        schema_version: 1,
        approval_id: "approval-1",
        source_agent_id: "enki",
        state: "approved",
        review_digest: digest,
        approved_at: "2026-10-30T09:01:00Z",
        expires_at: "2999-01-01T00:00:00Z",
        revoked_at: null,
        audit_event_id: "event-1",
        authorizes: { creation: false, activation: false },
      })
    );
  setup();
  fireEvent.change(screen.getByRole("textbox", { name: /Agent name/ }), {
    target: { value: "New Agent" },
  });
  const panel = within(
    screen.getAllByRole("region", { name: "Server review" })[0]
  );
  fireEvent.click(panel.getByRole("button", { name: "Validate on server" }));
  await waitFor(() =>
    expect(
      panel.getByLabelText("Reviewed composition preview")
    ).toHaveTextContent('"runtime_version": "v2"')
  );
  expect(fetchSpy.mock.calls[0][0]).toBe(
    "/api/caos/v2/agents/enki/creation-review"
  );
  expect(
    JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)).creation.name
  ).toBe("New Agent");
  const approve = panel.getByRole("button", { name: "Approve review" });
  expect(approve).toBeDisabled();
  fireEvent.click(
    panel.getByRole("checkbox", { name: /I approve this exact/ })
  );
  fireEvent.click(approve);
  await waitFor(() =>
    expect(panel.getByLabelText("Approval")).toHaveTextContent(
      "Approval approved"
    )
  );
  for (const button of screen.getAllByRole("button", { name: "Create Agent" }))
    expect(button).toBeDisabled();
  // Any edit makes the reviewed composition stale; it can no longer be approved.
  fireEvent.change(screen.getByRole("textbox", { name: /Agent name/ }), {
    target: { value: "Edited Agent" },
  });
  expect(
    panel.getByText(/changed after the server review/)
  ).toBeInTheDocument();
  expect(panel.getByLabelText("Approval")).toHaveTextContent(
    "for an earlier review"
  );
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  fetchSpy.mockRestore();
});

it("creates the approved Agent only after explicit confirmation and links to it", async () => {
  sessionStorage.clear();
  const digest = "e".repeat(64);
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json({
        contract: "caos.agent_creation_review",
        schema_version: 1,
        source_agent_id: "enki",
        validation: { valid: true, issues: [] },
        composition: {
          compatible: true,
          issues: [],
          preview: {
            name: "New Agent",
            type: "chat",
            role_name: "general",
            personality_key: "empty_eva",
          },
        },
        eligibility: { eligible: true, reasons: [] },
        review_digest: digest,
        validated_at: "2026-10-30T09:00:00Z",
        expires_at: "2999-01-01T00:00:00Z",
        capability: { signal: "data.validation", version: "1.0.0" },
        authorizes: { creation: false, activation: false },
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        contract: "caos.agent_creation_review_approval",
        schema_version: 1,
        approval_id: "approval-9",
        source_agent_id: "enki",
        state: "approved",
        review_digest: digest,
        approved_at: "2026-10-30T09:01:00Z",
        expires_at: "2999-01-01T00:00:00Z",
        revoked_at: null,
        audit_event_id: "event-1",
        authorizes: { creation: false, activation: false },
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        contract: "caos.agent_creation",
        schema_version: 1,
        creation_id: "creation-9",
        state: "completed",
        approval_id: "approval-9",
        source_agent_id: "enki",
        operation_id: "operation-9",
        agent_id: "agent-9",
        issue_codes: [],
        retryable: false,
        authorizes: { activation: false },
      })
    );
  setup();
  const panel = within(
    screen.getAllByRole("region", { name: "Server review" })[0]
  );
  const create = panel.getByRole("button", { name: "Create Agent" });
  expect(create).toBeDisabled();
  fireEvent.click(panel.getByRole("button", { name: "Validate on server" }));
  await waitFor(() =>
    expect(
      panel.getByRole("button", { name: "Approve review" })
    ).toBeInTheDocument()
  );
  fireEvent.click(
    panel.getByRole("checkbox", { name: /I approve this exact/ })
  );
  fireEvent.click(panel.getByRole("button", { name: "Approve review" }));
  await waitFor(() =>
    expect(panel.getByLabelText("Approval")).toHaveTextContent(
      "Approval approved"
    )
  );
  expect(create).toBeDisabled();
  fireEvent.click(
    panel.getByRole("checkbox", { name: /Create exactly this approved Agent/ })
  );
  expect(create).toBeEnabled();
  fireEvent.click(create);
  await waitFor(() =>
    expect(panel.getByLabelText("Creation status")).toHaveTextContent(
      "Created New Agent · chat · general · empty_eva (asleep)"
    )
  );
  expect(
    panel.getByRole("link", { name: "Open created Agent" })
  ).toHaveAttribute("href", "/v2/conversations?agent=agent-9");
  expect(fetchSpy.mock.calls[2][0]).toBe(
    "/api/caos/v2/agents/enki/creation-review/create"
  );
  expect(JSON.parse(String(fetchSpy.mock.calls[2][1]?.body))).toEqual({
    contract: "caos.agent_creation_request",
    schema_version: 1,
    approval_id: "approval-9",
    expected_review_digest: digest,
  });
  fetchSpy.mockRestore();
});
