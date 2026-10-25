import { mockAgentData } from "@/mocks/handlers";
import { getCurrentNavigationMocks } from "@/test-utils/test-utils";
import {
  chatWebSocket,
  connectionEventCount,
  resetConnectionEventCount,
} from "@/mocks/websocket";
import { render, screen, userEvent, waitFor } from "@/test-utils/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import AgentChat from "./page";

const navigationParams = {
  params: {
    agent_system_name: "test-agent",
    agent_id: "agent-123",
  },
};

vi.mock("../../_components/ToolChatBar/ToolChatBar", () => ({
  ToolChatBar: ({
    inputText,
    setInputText,
    onSubmit,
  }: {
    inputText: string;
    setInputText: (text: string) => void;
    onSubmit: () => void;
  }) => (
    <div data-testid="tool-chat-bar">
      <input
        data-testid="chat-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button data-testid="send-button" onClick={onSubmit}>
        Send
      </button>
    </div>
  ),
}));
vi.mock("../../_components/dialogs/SingleRagCollectionSetup", () => ({
  SetupDialog: () => null,
}));

describe("AgentChat Page", () => {
  beforeEach(() => {
    chatWebSocket.clients.forEach((client) => client.close());
  });

  afterEach(() => {
    chatWebSocket.clients.forEach((client) => client.close());
  });

  it("fetches agent data, establishes WebSocket connection and sends and receives chat messages", async () => {
    const user = userEvent.setup();
    render(<AgentChat />, { navigation: navigationParams });

    await waitFor(() => {
      expect(screen.getByText("Test Agent")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(chatWebSocket.clients.size).toBeGreaterThan(0);
    });

    // Type and send message
    const input = screen.getByTestId("chat-input");
    const sendButton = screen.getByTestId("send-button");

    await user.type(input, "Hello agent");
    await user.click(sendButton);

    expect(screen.getByText("Hello agent")).toBeInTheDocument();

    // mock server response via WebSocket
    chatWebSocket.broadcast(
      JSON.stringify({
        event: "test-agent.comm",
        response: {
          message: {
            renderables: [{ kind: "text", text: "Hello from agent!" }],
          },
        },
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Hello from agent!")).toBeInTheDocument();
    });
  });
});

it("redirects a bookmarked V1 URL for an explicitly V2 agent without opening a V1 socket", async () => {
  chatWebSocket.clients.forEach((client) => client.close());
  resetConnectionEventCount();
  render(<AgentChat />, {
    navigation: navigationParams,
    agent: {
      fetchAgentById: {
        success: true,
        data: { ...mockAgentData, runtime_version: "v2" },
      },
    },
  });
  await screen.findByRole("status");
  await waitFor(() =>
    expect(getCurrentNavigationMocks().replace).toHaveBeenCalledWith(
      "/v2/conversations?agent=agent-123"
    )
  );
  expect(connectionEventCount).toBe(0);
  expect(screen.queryByTestId("tool-chat-bar")).not.toBeInTheDocument();
});
