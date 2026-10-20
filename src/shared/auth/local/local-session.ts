
import type { Session } from "../auth.types";

type LocalAdminSession = Session & {
  roles: string[];
};

export const LOCAL_ADMIN_ID =
  "00000000-0000-4000-8000-000000000001";

export const LOCAL_ADMIN_SESSION: LocalAdminSession = {
  sub: LOCAL_ADMIN_ID,
  name: "Local Administrator",
  preferred_username: "admin@localhost",
  roles: [
    "agentverse-admin",
    "agentverse-user",
  ],
};

export function getLocalSession(): LocalAdminSession {
  return {
    ...LOCAL_ADMIN_SESSION,
    roles: [...LOCAL_ADMIN_SESSION.roles],
  };
}
