import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test-utils/test-utils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DraftWorkspace } from "./DraftWorkspace";
import { presentationFixture } from "@/shared/lib/enki/draft.fixture";

vi.mock("@/shared/hooks/useWorkflowCatalog", () => ({
  useWorkflowCatalog: () => ({ status: "ready", entries: [] }),
}));

const BASE = "/api/caos/v2/agents/enki/drafts";
const ID = "0b5c2d4e-1f00-5a00-8000-000000000001";
const PROPOSAL = "0b5c2d4e-1f00-5a00-8000-0000000000aa";
const DIGEST = "d".repeat(64);
const never = {
  review: false,
  approval: false,
  creation: false,
  activation: false,
};

type Draft = {
  revision: number;
  status: "editing" | "approved" | "consumed";
  creation: Record<string, unknown>;
  lifecycle: Record<string, unknown> | null;
};

/** In-memory stand-in for the governed draft API (the server is authoritative). */
class FakeDraftApi {
  draft: Draft = {
    revision: 1,
    status: "editing",
    creation: {},
    lifecycle: null,
  };
  exists = true;
  proposals: Record<string, unknown>[] = [];
  calls: { method: string; url: string; body?: unknown }[] = [];
  unavailable = false;

  view() {
    return {
      contract: "caos.agent_draft",
      schema_version: 1,
      draft_id: ID,
      source_agent_id: "enki",
      revision: this.draft.revision,
      status: this.draft.status,
      draft: {
        contract: "caos.agent_creation_draft",
        schema_version: 1,
        resource_type: "agent",
        creation: this.draft.creation,
      },
      provenance: {},
      content_digest: "a".repeat(64),
      lifecycle: this.draft.lifecycle,
      forked_from: null,
      created_at: "2026-10-30T09:00:00.000Z",
      updated_at: "2026-10-30T09:00:00.000Z",
      authorizes: never,
    };
  }

  /** Another tab or proposal commits a revision. */
  commitElsewhere(changes: Record<string, unknown>) {
    this.draft = {
      ...this.draft,
      revision: this.draft.revision + 1,
      creation: { ...this.draft.creation, ...changes },
    };
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    this.calls.push({ method, url, body });
    if (this.unavailable) return Response.json({ error: "x" }, { status: 503 });
    const json = (data: unknown, status = 200) =>
      Response.json(data, { status });
    if (url.startsWith(`${BASE}?`))
      return json({
        contract: "caos.agent_draft_page",
        items:
          this.exists && this.draft.status !== "consumed" ? [this.view()] : [],
        next_cursor: null,
      });
    if (url === BASE && method === "POST") {
      this.exists = true;
      return json(this.view(), 201);
    }
    if (url === `${BASE}/${ID}` && method === "GET") return json(this.view());
    if (url === `${BASE}/${ID}` && method === "PATCH") {
      if (this.draft.status !== "editing")
        return json(
          {
            code: `draft.${this.draft.status}`,
            current_revision: this.draft.revision,
          },
          409
        );
      if (body.expected_revision !== this.draft.revision)
        return json(
          {
            code: "draft.revision_conflict",
            current_revision: this.draft.revision,
          },
          409
        );
      this.commitElsewhere(body.changes);
      return json(this.view());
    }
    if (url.startsWith(`${BASE}/${ID}/proposals?`))
      return json({
        contract: "caos.agent_draft_proposal_page",
        current_revision: this.draft.revision,
        items: this.proposals,
        next_cursor: null,
      });
    if (url === `${BASE}/${ID}/proposals/${PROPOSAL}/decision`) {
      const proposal = this.proposals[0] as {
        changes: Record<string, unknown>;
      };
      if (body.decision === "accept")
        this.commitElsewhere(
          Object.fromEntries(
            body.fields.map((f: string) => [f, proposal.changes[f]])
          )
        );
      this.proposals = [];
      return json({
        proposal: { ...this.proposalView(), state: "accepted" },
        draft: this.view(),
      });
    }
    if (url === `${BASE}/${ID}/revisions/${this.draft.revision}/review`)
      return json({
        contract: "caos.agent_creation_review",
        schema_version: 1,
        source_agent_id: "enki",
        validation: { valid: true, issues: [] },
        composition: {
          compatible: true,
          issues: [],
          preview: { name: "Server Agent", type: "chat" },
        },
        eligibility: { eligible: true, reasons: [] },
        review_digest: DIGEST,
        validated_at: "2026-10-30T09:00:00Z",
        expires_at: "2999-01-01T00:00:00Z",
        capability: { signal: "data.validation", version: "1.0.0" },
        authorizes: { creation: false, activation: false },
        draft_ref: {
          draft_id: ID,
          revision: this.draft.revision,
          content_digest: "a".repeat(64),
        },
      });
    if (url === `${BASE}/${ID}/approval`) {
      const reviewed = this.draft.revision;
      this.draft = {
        ...this.draft,
        revision: reviewed + 1,
        status: "approved",
        lifecycle: {
          approval_id: "approval-7",
          review_digest: DIGEST,
          reviewed_revision: reviewed,
          creation_id: null,
          agent_id: null,
        },
      };
      return json({
        approval: {
          contract: "caos.agent_creation_review_approval",
          schema_version: 1,
          approval_id: "approval-7",
          source_agent_id: "enki",
          state: "approved",
          review_digest: DIGEST,
          approved_at: "2026-10-30T09:01:00Z",
          expires_at: "2999-01-01T00:00:00Z",
          revoked_at: null,
          audit_event_id: "event-7",
          authorizes: { creation: false, activation: false },
        },
        draft: this.view(),
      });
    }
    if (url === "/api/caos/v2/agents/enki/creation-review/create") {
      this.draft = {
        ...this.draft,
        revision: this.draft.revision + 1,
        status: "consumed",
        lifecycle: {
          ...this.draft.lifecycle,
          creation_id: "creation-1",
          agent_id: "agent-42",
        },
      };
      return json({
        contract: "caos.agent_creation",
        schema_version: 1,
        creation_id: "creation-1",
        state: "completed",
        approval_id: "approval-7",
        source_agent_id: "enki",
        operation_id: "op-1",
        agent_id: "agent-42",
        issue_codes: [],
        retryable: false,
        authorizes: { activation: false },
      });
    }
    return json({ error: `unexpected ${method} ${url}` }, 404);
  };

  proposalView() {
    return {
      contract: "caos.agent_draft_proposal",
      proposal_id: PROPOSAL,
      draft_id: ID,
      origin: "enki",
      proposer_agent_id: "enki",
      base_revision: 1,
      changes: { name: "Enki Name", prompt: "Summarize contracts faithfully." },
      remove: [],
      rationale: null,
      state: "pending",
      fields: ["name", "prompt"],
      current_revision: this.draft.revision,
      conflicting_fields: ["name"],
      applicable_fields: ["prompt"],
      expires_at: "2999-01-01T00:00:00Z",
      authorizes: never,
    };
  }
}

let api: FakeDraftApi;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  api = new FakeDraftApi();
  vi.spyOn(globalThis, "fetch").mockImplementation(api.fetch);
});
afterEach(() => vi.restoreAllMocks());

function setup() {
  return render(
    <DraftWorkspace
      agentId="enki"
      name="Enki"
      presentation={presentationFixture}
      persistence="server"
    />
  );
}

const nameField = () => screen.getByRole("textbox", { name: /Agent name/ });
const bar = () => within(screen.getByRole("region", { name: "Server draft" }));

it("resumes the server draft, keeps unsaved edits across a reload and saves with its revision", async () => {
  api.draft.creation = { name: "Server Name" };
  const first = setup();
  await waitFor(() => expect(nameField()).toHaveValue("Server Name"));
  expect(bar().getByText(/revision 1 · All changes saved/)).toBeInTheDocument();
  fireEvent.change(nameField(), { target: { value: "Edited Locally" } });
  expect(bar().getByText(/Unsaved changes: Name/)).toBeInTheDocument();
  first.unmount(); // Reload of the same tab.
  setup();
  await waitFor(() => expect(nameField()).toHaveValue("Edited Locally"));
  expect(bar().getByText(/Unsaved changes: Name/)).toBeInTheDocument();
  fireEvent.click(bar().getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(
      bar().getByText(/revision 2 · All changes saved/)
    ).toBeInTheDocument()
  );
  const patch = api.calls.find((call) => call.method === "PATCH");
  expect(patch?.body).toEqual({
    contract: "caos.agent_draft_update",
    schema_version: 1,
    expected_revision: 1,
    changes: { name: "Edited Locally" },
    remove: [],
  });
  expect(sessionStorage.getItem(`caos:enki-draft-local:${ID}`)).toBeNull();
});

it("creates a draft once when none is open", async () => {
  api.exists = false;
  setup();
  await waitFor(() =>
    expect(bar().getByText(/revision 1/)).toBeInTheDocument()
  );
  const create = api.calls.find(
    (call) => call.method === "POST" && call.url === BASE
  );
  expect(create?.body).toEqual({
    contract: "caos.agent_creation_draft",
    schema_version: 1,
    resource_type: "agent",
    creation: {},
  });
});

it("merges another tab's save and makes overlapping edits explicit conflicts", async () => {
  api.draft.creation = { name: "Original", prompt: "Original prompt" };
  setup();
  await waitFor(() => expect(nameField()).toHaveValue("Original"));
  fireEvent.change(nameField(), { target: { value: "Mine" } });
  api.commitElsewhere({ name: "Theirs", prompt: "Their prompt" }); // Another tab.
  fireEvent.click(bar().getByRole("button", { name: "Save draft" }));
  const conflicts = await screen
    .findByRole("region", { name: "Server draft" })
    .then(() => screen.findByLabelText("Draft conflicts"));
  expect(conflicts).toHaveTextContent("Yours: Mine");
  expect(conflicts).toHaveTextContent("Saved elsewhere: Theirs");
  expect(nameField()).toHaveValue("Mine"); // Never silently overwritten.
  // The non-overlapping field took the other tab's value.
  expect(
    screen.getAllByText(/"prompt": "Their prompt"/).length
  ).toBeGreaterThan(0);
  expect(bar().getByRole("button", { name: "Save draft" })).toBeDisabled();
  fireEvent.click(within(conflicts).getByRole("button", { name: "Keep mine" }));
  fireEvent.click(bar().getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(
      bar().getByText(/revision 3 · All changes saved/)
    ).toBeInTheDocument()
  );
  const patches = api.calls.filter((call) => call.method === "PATCH");
  expect(patches.at(-1)?.body).toMatchObject({
    expected_revision: 2,
    changes: { name: "Mine" },
  });
});

it("uses the saved value when the human chooses it", async () => {
  api.draft.creation = { name: "Original" };
  setup();
  await waitFor(() => expect(nameField()).toHaveValue("Original"));
  fireEvent.change(nameField(), { target: { value: "Mine" } });
  api.commitElsewhere({ name: "Theirs" });
  fireEvent.click(bar().getByRole("button", { name: "Save draft" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Use saved value" })
  );
  await waitFor(() => expect(nameField()).toHaveValue("Theirs"));
  expect(bar().getByText(/All changes saved/)).toBeInTheDocument();
});

it("lists pending proposals and accepts only the selected applicable fields", async () => {
  api.draft.creation = { name: "Human Name" };
  api.proposals = [api.proposalView()];
  setup();
  const panel = within(
    (await screen.findAllByRole("region", { name: "Proposals" }))[0]
  );
  const [name, prompt] = panel.getAllByRole("checkbox");
  expect(name).toBeDisabled(); // Conflicting: changed since the proposal.
  fireEvent.click(prompt);
  fireEvent.click(panel.getByRole("button", { name: "Accept selected" }));
  await waitFor(() =>
    expect(
      screen.getAllByText(/"prompt": "Summarize contracts faithfully."/).length
    ).toBeGreaterThan(0)
  );
  const decision = api.calls.find((call) => call.url.endsWith("/decision"));
  expect(decision?.body).toEqual({
    contract: "caos.agent_draft_proposal_decision",
    schema_version: 1,
    decision: "accept",
    confirmed: true,
    expected_revision: 1,
    fields: ["prompt"],
  });
  expect(nameField()).toHaveValue("Human Name");
  expect(screen.queryAllByRole("region", { name: "Proposals" })).toHaveLength(
    0
  );
});

it("reviews and approves the exact saved revision, freezes editing and creates once", async () => {
  api.draft.creation = { name: "Server Agent", type: "chat" };
  setup();
  await waitFor(() => expect(nameField()).toHaveValue("Server Agent"));
  const review = within(
    screen.getAllByRole("region", { name: "Server review" })[0]
  );
  // Unsaved edits cannot be reviewed.
  fireEvent.change(nameField(), { target: { value: "Unsaved" } });
  fireEvent.click(review.getByRole("button", { name: "Validate on server" }));
  expect(api.calls.some((call) => call.url.includes("/review"))).toBe(false);
  fireEvent.click(
    bar().getByRole("button", { name: "Discard unsaved changes" })
  );
  fireEvent.click(review.getByRole("button", { name: "Validate on server" }));
  await waitFor(() =>
    expect(
      review.getByRole("button", { name: "Approve review" })
    ).toBeInTheDocument()
  );
  expect(api.calls.find((call) => call.url.includes("/review"))?.url).toBe(
    `${BASE}/${ID}/revisions/1/review`
  );
  fireEvent.click(
    review.getByRole("checkbox", { name: /I approve this exact/ })
  );
  fireEvent.click(review.getByRole("button", { name: "Approve review" }));
  await waitFor(() =>
    expect(
      bar().getByText(/Approved \(revision 1\); editing is frozen/)
    ).toBeInTheDocument()
  );
  expect(
    api.calls.find((call) => call.url.endsWith("/approval"))?.body
  ).toMatchObject({
    contract: "caos.agent_draft_approval",
    revision: 1,
    review_digest: DIGEST,
    confirmed: true,
  });
  expect(nameField()).toBeDisabled();
  expect(
    bar().queryByRole("button", { name: "Save draft" })
  ).not.toBeInTheDocument();
  expect(
    review.queryByRole("button", { name: "Revoke approval" })
  ).not.toBeInTheDocument();
  fireEvent.click(
    review.getByRole("checkbox", { name: /Create exactly this approved Agent/ })
  );
  await act(async () => {
    fireEvent.click(review.getAllByRole("button", { name: "Create Agent" })[0]);
  });
  await waitFor(() =>
    expect(bar().getByText(/Created an Agent; read-only/)).toBeInTheDocument()
  );
  const create = api.calls.find((call) =>
    call.url.endsWith("/creation-review/create")
  );
  expect(create?.body).toEqual({
    contract: "caos.agent_creation_request",
    schema_version: 1,
    approval_id: "approval-7",
    expected_review_digest: DIGEST,
  });
  expect(bar().getByText(/agent-42/)).toBeInTheDocument();
  expect(
    bar().getByRole("button", { name: "Start a new draft from this one" })
  ).toBeInTheDocument();
  expect(nameField()).toBeDisabled();
});

it("keeps editing locally when server drafts are unavailable", async () => {
  api.unavailable = true;
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent(/not saved/);
  fireEvent.change(nameField(), { target: { value: "Local only" } });
  expect(nameField()).toHaveValue("Local only");
});
