export type Session = {
  sub: string;
  localAccessToken?: string;
  name?: string;
  preferred_username?: string;
  homeAccountId?: string;
  roles?: string[];
};

export type RouteProtection = {
  pattern: string; // URL pattern (supports wildcards via startsWith matching)
  roles: string[]; // Required roles (user needs at least one)
  requireAuth: boolean;
  description?: string;
};
