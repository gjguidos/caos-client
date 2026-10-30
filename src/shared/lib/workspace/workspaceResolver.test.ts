import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_KIND,
  getWorkspaceDescriptor,
  resolveWorkspace,
  resolveWorkspaceKind,
  workspaceKindFromPathname,
} from "./workspaceResolver";

describe("resolveWorkspaceKind", () => {
  it("maps 'orchestration' to the orchestration workspace", () => {
    expect(resolveWorkspaceKind("orchestration")).toBe("orchestration");
  });

  it("is case-insensitive on the type value", () => {
    expect(resolveWorkspaceKind("Orchestration")).toBe("orchestration");
    expect(resolveWorkspaceKind("ORCHESTRATION")).toBe("orchestration");
  });

  it("maps the chat agent type key to chat", () => {
    expect(resolveWorkspaceKind("chat")).toBe("chat");
    expect(resolveWorkspaceKind("Chat")).toBe("chat");
  });

  it("falls back to chat for an agent type without its own workspace", () => {
    expect(resolveWorkspaceKind("research")).toBe("chat");
    expect(resolveWorkspaceKind("something-else")).toBe("chat");
  });

  it.each([null, undefined, ""])(
    "falls back to the default workspace when type is %p",
    (value) => {
      expect(resolveWorkspaceKind(value as string | null | undefined)).toBe(
        DEFAULT_WORKSPACE_KIND
      );
    }
  );
});

describe("getWorkspaceDescriptor", () => {
  it("builds a chat route from an agent", () => {
    const descriptor = getWorkspaceDescriptor("chat");
    expect(descriptor.kind).toBe("chat");
    expect(descriptor.routeFor({ system_name: "sys", id: "42" })).toBe(
      "/chat/sys/42"
    );
  });

  it("builds an orchestration route from an agent", () => {
    const descriptor = getWorkspaceDescriptor("orchestration");
    expect(descriptor.kind).toBe("orchestration");
    expect(descriptor.routeFor({ system_name: "sys", id: "42" })).toBe(
      "/orchestration/sys/42"
    );
  });

  it("exposes panel configuration per workspace", () => {
    expect(getWorkspaceDescriptor("chat").panels).toEqual({
      left: true,
      right: true,
    });
    expect(getWorkspaceDescriptor("orchestration").panels).toEqual({
      left: true,
      right: false,
    });
  });
});

describe("resolveWorkspace", () => {
  it("routes an orchestration agent to the orchestration workspace", () => {
    const descriptor = resolveWorkspace({ type: "orchestration" });
    expect(descriptor.kind).toBe("orchestration");
    expect(
      descriptor.routeFor({
        type: "orchestration",
        system_name: "wf",
        id: "1",
      })
    ).toBe("/orchestration/wf/1");
  });

  it("routes an agent with no type to chat", () => {
    const descriptor = resolveWorkspace({ type: null });
    expect(descriptor.kind).toBe("chat");
    expect(descriptor.routeFor({ system_name: "wf", id: "1" })).toBe(
      "/chat/wf/1"
    );
  });
});

describe("workspaceKindFromPathname", () => {
  it("detects the chat workspace from a chat route", () => {
    expect(workspaceKindFromPathname("/chat/sys/42")).toBe("chat");
  });

  it("detects the orchestration workspace from an orchestration route", () => {
    expect(workspaceKindFromPathname("/orchestration/sys/42")).toBe(
      "orchestration"
    );
  });

  it.each([null, undefined, "", "/", "/admin", "/chat", "/orchestration"])(
    "returns null for non-agent route %p",
    (pathname) => {
      expect(
        workspaceKindFromPathname(pathname as string | null | undefined)
      ).toBeNull();
    }
  );
});

// Identity, names and roles never select the GUI; the backend resolves defaults.
it("routes the effective form and preserves the V1 fallback for empty lists", () => {
  const agent = {
    id: "enki",
    system_name: "enki",
    type: "form",
    role_name: "enki",
    runtime_version: "v2" as const,
    effective_gui_components: [
      {
        type: "form",
        key: "configuration",
        default: true,
        version: 1,
        config: {},
      },
    ],
  };
  expect(resolveWorkspace(agent).routeFor(agent)).toBe("/v2/forms/enki");
  expect(
    resolveWorkspace({ ...agent, role_name: "crawler" }).routeFor(agent)
  ).toBe("/v2/forms/enki");
  expect(
    resolveWorkspace({ ...agent, effective_gui_components: [] }).routeFor(agent)
  ).toBe("/form/enki/enki");
});

it("routes Thoth's primary chat to the existing conversation experience", () => {
  const agent = {
    type: "chat",
    system_name: "renamed",
    id: "any-id",
    runtime_version: "v2" as const,
    effective_gui_components: [
      {
        type: "chat",
        key: "conversation",
        default: true,
        version: 1,
        config: {},
      },
    ],
  };
  expect(resolveWorkspace(agent).routeFor(agent)).toBe(
    "/v2/conversations?agent=any-id"
  );
  expect(
    resolveWorkspace({ ...agent, effective_gui_components: [] }).routeFor(agent)
  ).toBe("/chat/renamed/any-id");
  expect(
    resolveWorkspace({ type: "chat" }).routeFor({
      system_name: "adam",
      id: "adam",
    })
  ).toBe("/chat/adam/adam");
});

it.each(["dashboard", "terminal", "tabs"])(
  "does not silently route unsupported %s to chat",
  (type) => {
    const agent = {
      type: "chat",
      system_name: "thoth",
      id: "t",
      effective_gui_components: [
        { type, key: "primary", default: true, version: 1, config: {} },
      ],
    };
    const workspace = resolveWorkspace(agent);
    expect(workspace.openLabel).toBe("Unsupported interface");
    expect(workspace.routeFor(agent)).toBe("/v2/forms/t");
  }
);

it("does not fall back to chat for unsupported versions or ambiguous defaults", () => {
  const component = {
    type: "chat",
    key: "primary",
    default: true,
    version: 2,
    config: {},
  };
  expect(
    resolveWorkspace({ effective_gui_components: [component] }).openLabel
  ).toBe("Unsupported interface");
  expect(
    resolveWorkspace({
      effective_gui_components: [
        { ...component, version: 1 },
        { ...component, version: 1, key: "second" },
      ],
    }).openLabel
  ).toBe("Unsupported interface");
});
