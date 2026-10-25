import { expect, test, type Page } from "@playwright/test";
const agentId = process.env.CAOS_E2E_AGENT_ID || "";
test.skip(
  !agentId,
  "Set CAOS_E2E_AGENT_ID to an already provisioned, UTU-authorized Adam ID. No test grants are installed."
);

async function login(page: Page) {
  await page.goto("/api/auth/login");
  await page.waitForURL("/");
  await page.goto("/v2/conversations");
  await expect(
    page.getByRole("button", { name: "Connect", exact: true })
  ).toBeEnabled();
}

test("real login, creation, ticket socket, correlated Adam LLM reply, reopen and remote logout", async ({
  page,
  context,
}) => {
  const sent: Array<Record<string, unknown>> = [];
  const received: Array<Record<string, unknown>> = [];
  const sockets: string[] = [];
  page.on("websocket", (socket) => {
    if (!socket.url().includes("/ws/api/v2/caos")) return;
    sockets.push(socket.url());
    expect(new URL(socket.url()).search).toBe("");
    socket.on("framesent", (frame) => {
      const data = JSON.parse(String(frame.payload));
      if (data.type !== "authenticate") sent.push(data); // Never retain or report tickets.
    });
    socket.on("framereceived", (frame) =>
      received.push(JSON.parse(String(frame.payload)))
    );
  });
  await login(page);
  await page.getByLabel("Authorized agent IDs").fill(agentId);
  await page
    .getByRole("button", { name: "Create conversation", exact: true })
    .click();
  await expect(page).toHaveURL(/conversation=[\w-]+/);
  const id = new URL(page.url()).searchParams.get("conversation");
  if (!id)
    throw new Error("Creation did not return a reusable conversation URL");
  await expect(
    page.getByRole("heading", { name: `Conversation ${id}`, exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText("Connection: session.ready", { exact: true })
  ).toBeVisible();
  const text = "Hello Adam. Please reply with one short greeting sentence.";
  await page.getByLabel("Message to selected agents").fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("LLM conversational response", {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  const reply = received.find((event) => event.type === "chat.response");
  expect(reply).toBeDefined();
  const result = (
    reply?.results as Array<{
      agent_id: string;
      response: { content: string };
      llm: { key: string; model: string };
    }>
  )[0];
  expect(result.agent_id).toBe(agentId);
  expect(result.response.content.trim().length).toBeGreaterThan(0);
  expect(result.llm.key).toBeTruthy();
  // eslint-disable-next-line no-console -- nonsecret actual model verification
  console.log("Actual Adam model:", JSON.stringify(result.llm));
  await expect(
    page.getByText(result.response.content, { exact: true })
  ).toBeVisible();
  const submission = sent.find((event) => event.type === "chat.message");
  if (!submission) throw new Error("No chat.message was sent");
  expect(submission.conversation_id).toBe(id);
  expect(submission.agent_ids).toEqual([agentId]);
  expect(
    received.some(
      (event) =>
        event.type === "chat.response" &&
        event.correlation_id === submission.event_id &&
        event.conversation_id === id
    )
  ).toBe(true);
  expect(sockets).toHaveLength(1);
  await page.screenshot({
    path: "test-results/v2-llm.png",
    fullPage: true,
  });

  await page.reload();
  await expect(
    page.getByText(result.response.content, { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `Conversation ${id}`, exact: true })
  ).toBeVisible();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Conversation history" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText("Connection: session.ready", { exact: true })
  ).toBeVisible();
  expect(sent.filter((event) => event.type === "chat.message")).toHaveLength(1);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText("Connection: session.ready", { exact: true })
  ).toBeVisible();
  expect(sent.filter((event) => event.type === "chat.message")).toHaveLength(1);

  // Existing logout endpoint performs real durable backend revocation in another tab.
  const otherTab = await context.newPage();
  await otherTab.goto("/api/auth/logout");
  await expect(page.getByText(/Session unavailable or revoked/)).toBeVisible();
  await expect(page.getByLabel("Message to selected agents")).toHaveCount(0);
  await otherTab.close();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true })
  ).toBeVisible();
});

test("unauthorized participants and unknown conversation IDs fail visibly", async ({
  page,
}) => {
  await login(page);
  await page
    .getByLabel("Authorized agent IDs")
    .fill("unauthorized-smoke-agent");
  await page
    .getByRole("button", { name: "Create conversation", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "HTTP 403" })
  ).toContainText("HTTP 403");
  await page
    .getByLabel("Open conversation ID")
    .fill("unknown-smoke-conversation");
  await page
    .getByRole("button", { name: "Open conversation", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "HTTP 403" })
  ).toContainText("HTTP 403");
  await expect(
    page.getByRole("button", { name: "Send message", exact: true })
  ).toHaveCount(0);
  await page.goto("/api/auth/logout");
});

test("persisted V2 Adam redirects before opening a legacy socket", async ({
  page,
}) => {
  const v2Sockets: string[] = [];
  page.on("websocket", (socket) => {
    if (socket.url().includes("/ws/api/v2/caos")) v2Sockets.push(socket.url());
  });
  await login(page);
  await page.goto(`/chat/adam/${encodeURIComponent(agentId)}`);
  await expect(page).toHaveURL(/v2\/conversations\?agent=/);
  await expect(page.getByLabel("Authorized agent IDs")).toHaveValue(agentId);
  expect(v2Sockets).toHaveLength(0);
  await page.goto("/api/auth/logout");
});
