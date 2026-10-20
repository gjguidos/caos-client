import { describe, expect, it } from "vitest";
import { defaultToolKeyForRole, TOOL_KEYS } from "./toolKeys";

const writerTool = { key: TOOL_KEYS.writer };
const greenClaimTool = { key: TOOL_KEYS.greenClaim };
const chatTool = { key: "chat" };

describe("defaultToolKeyForRole", () => {
  it("resolves the role registry key", () => {
    expect(
      defaultToolKeyForRole("writer_assistant", [chatTool, writerTool])
    ).toBe(TOOL_KEYS.writer);
    expect(defaultToolKeyForRole("compliance_auditor", [greenClaimTool])).toBe(
      TOOL_KEYS.greenClaim
    );
  });

  it("resolves a display-name spelling of the role", () => {
    expect(defaultToolKeyForRole("Writer Assistant", [writerTool])).toBe(
      TOOL_KEYS.writer
    );
    expect(defaultToolKeyForRole("Compliance Auditor", [greenClaimTool])).toBe(
      TOOL_KEYS.greenClaim
    );
  });

  it("returns null when the agent does not carry the tool", () => {
    expect(defaultToolKeyForRole("writer_assistant", [chatTool])).toBeNull();
    expect(defaultToolKeyForRole("writer_assistant", [])).toBeNull();
  });

  it("returns null for roles with no default tool", () => {
    expect(defaultToolKeyForRole("assistant", [writerTool])).toBeNull();
    expect(defaultToolKeyForRole("", [writerTool])).toBeNull();
    expect(defaultToolKeyForRole(null, [writerTool])).toBeNull();
  });
});
