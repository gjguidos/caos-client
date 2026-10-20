/**
 * Client-side hook to access authentication state
 *
 * Reads the session from the SessionProvider context in the root layout.
 * This eliminates client-side /api/auth/session requests during navigation.
 *
 * @example
 * ```typescript
 * /Check if user is authenticated
 * const { userId } = useAuth();
 * if (!userId) return <SignInPrompt />;
 *
 * /Get user details
 * const { session } = useAuth();
 * return <div>Welcome, {session?.name}</div>;
 *
 * /Redirect if not authenticated
 * const { userId } = useAuth();
 * if (!userId) redirect('/');
 * ```
 */
"use client";

import type { Session } from "@/shared/auth/lib/session";
import { useSession } from "@/shared/auth/SessionProvider";

type AuthState = {
  session: Session | null;
  userId: string | null;
  isAuthLoading: boolean;
  roles: string[];
  isSuperAdmin: boolean;
  adminGroupIds: string[];
  userGroupIds: string[];
  canCreateAgent: boolean;
};

function deriveRoleState(roles: string[] = []) {
  const adminGroupIds: string[] = [];
  const userGroupIds: string[] = [];
  let isSuperAdmin = false;

  roles.forEach((role) => {
    const lower = role.toLowerCase();
    if (lower === "agentverse-admin") {
      isSuperAdmin = true;
    }

    // Matches everything before the final .admin or .user suffix
    const match = role.match(/^(.+)\.(admin|user)$/i);
    if (match) {
      const [, groupId, kind] = match;
      if (kind.toLowerCase() === "admin") adminGroupIds.push(groupId);
      if (kind.toLowerCase() === "user") userGroupIds.push(groupId);
    }
  });

  const canCreateAgent = isSuperAdmin || adminGroupIds.length > 0;
  return { adminGroupIds, userGroupIds, isSuperAdmin, canCreateAgent };
}

export function useAuth(): AuthState {
  const session = useSession();
  const roles = session?.roles || [];
  const derived = deriveRoleState(roles);

  return {
    session,
    userId: session?.sub || null,
    isAuthLoading: false,
    roles,
    ...derived,
  };
}
