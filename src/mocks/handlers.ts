import { http, HttpResponse } from "msw";

// JWT format (header.payload.signature)
const MOCK_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";

export const mockAgentData = {
  id: "agent-123",
  name: "Test Agent",
  role_name: "assistant",
  tools: [],
  collections: [],
  personality_key: "friendly_assistant",
};

export const handlers = [
  http.get("/api/auth/websocket-token", () => {
    return HttpResponse.json({ token: MOCK_JWT });
  }),

  http.get("http://localhost:8001/api/v1/agents/id/:agentId", () => {
    return HttpResponse.json({
      success: true,
      data: mockAgentData,
    });
  }),
];
