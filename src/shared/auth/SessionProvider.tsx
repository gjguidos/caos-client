"use client";

import type { Session } from "@/shared/auth/auth.types";
import { createContext, useContext, type ReactNode } from "react";

// Carries the server-side session down to client components. The root layout reads it from the signed cookie and hands
// it to this provider; nothing on the client mutates it, so it is a value that flows down rather than application
// state.
//
// Context rather than the Redux store, for two reasons. The value is per-render, so a session can never be visible to
// another request during SSR the way a module-level store would allow. And consumers see it on the first render of the
// tree, so there is no null-session flash and no write during render to arrange one.
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session | null {
  return useContext(SessionContext);
}
