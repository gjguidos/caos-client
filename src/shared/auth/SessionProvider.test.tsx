import type { Session } from "@/shared/auth/auth.types";
import { SessionProvider } from "@/shared/auth/SessionProvider";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vitest.setup mocks useAuth for every other suite; this one exercises the real hook against a real provider.
const { useAuth } = await vi.importActual<
  typeof import("@/shared/auth/hooks/useAuth")
>("@/shared/auth/hooks/useAuth");

const session: Session = {
  sub: "user-1",
  name: "Ada",
  roles: ["team-a.admin", "team-b.user", "agentverse-user"],
};

// Records what useAuth returned on every render, so a test can assert on the *first* one rather than only the
// settled result.
function probe<T>(read: () => T) {
  const renders: T[] = [];
  const Probe = () => {
    renders.push(read());
    return null;
  };
  return { renders, Probe };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SessionProvider", () => {
  it("exposes the session to consumers on their very first render", () => {
    const { renders, Probe } = probe(() => useAuth().userId);

    render(
      <SessionProvider session={session}>
        <Probe />
      </SessionProvider>
    );

    // One render, already authenticated: no null-session flash to paper over afterwards.
    expect(renders).toEqual(["user-1"]);
  });

  it("renders without React warning about an update during render", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { Probe } = probe(() => useAuth().userId);

    render(
      <SessionProvider session={session}>
        <Probe />
      </SessionProvider>
    );

    expect(consoleError).not.toHaveBeenCalled();
  });

  it("derives role state from the provided session", () => {
    const { renders, Probe } = probe(() => useAuth());

    render(
      <SessionProvider session={session}>
        <Probe />
      </SessionProvider>
    );

    expect(renders[0]).toMatchObject({
      userId: "user-1",
      roles: session.roles,
      adminGroupIds: ["team-a"],
      userGroupIds: ["team-b"],
      isSuperAdmin: false,
      canCreateAgent: true,
      isAuthLoading: false,
    });
  });

  it("propagates a session change to consumers", () => {
    const { renders, Probe } = probe(() => useAuth().userId);

    const { rerender } = render(
      <SessionProvider session={session}>
        <Probe />
      </SessionProvider>
    );

    rerender(
      <SessionProvider session={null}>
        <Probe />
      </SessionProvider>
    );

    expect(renders.at(-1)).toBeNull();
  });

  it("reports no session outside a provider", () => {
    const { renders, Probe } = probe(() => useAuth());

    render(<Probe />);

    expect(renders[0]).toMatchObject({
      session: null,
      userId: null,
      roles: [],
      canCreateAgent: false,
    });
  });
});
