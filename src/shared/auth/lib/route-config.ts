/**
 * Route protection configuration
 * Maps route patterns to required roles
 *
 * This is the single source of truth for route-to-role mappings.
 * Add new routes here to protect them with role-based access control.
 */

import type { RouteProtection } from "../auth.types";

export type { RouteProtection };

/**
 * Route protection configuration
 * Routes are matched by prefix (most specific match wins)
 */
export const ROUTE_PROTECTIONS: RouteProtection[] = [
  // Build-mode routes - require a builder role. Admin is a capability now, not
  // a destination, so protection is keyed off what the route does rather than
  // off a shared `/admin` prefix.
  //
  // The trailing slash on "/agents/" matters: `getRouteProtection` matches by
  // prefix, so an unslashed "/agents" would also claim any future "/agentfoo".
  {
    pattern: "/agents/",
    roles: ["agentverse-admin", "*.admin"],
    requireAuth: true,
    description: "Agent builder (create and edit)",
  },
  {
    pattern: "/workflows",
    roles: ["agentverse-admin", "*.admin"],
    requireAuth: true,
    description: "Workflow catalog and builder",
  },

  // User routes - require user role (admin also has access)
  {
    pattern: "/chat",
    roles: ["agentverse-user", "agentverse-admin"],
    requireAuth: true,
    description: "Chat interface with agents",
  },
  {
    pattern: "/orchestration",
    roles: ["agentverse-user", "agentverse-admin"],
    requireAuth: true,
    description: "Workflow run canvas for orchestration agents",
  },

  // Public routes - no authentication required
  {
    pattern: "/",
    roles: [],
    requireAuth: false,
    description: "Public landing page",
  },
];

/**
 * Get protection config for a given pathname
 * Returns the most specific matching pattern (longest match wins)
 *
 * @param pathname - The URL pathname to check (e.g., "/agents/new")
 * @returns RouteProtection config or null if no match
 */
export function getRouteProtection(pathname: string): RouteProtection | null {
  // Find all matching patterns and return the most specific one (longest pattern)
  const matches = ROUTE_PROTECTIONS.filter((config) =>
    pathname.startsWith(config.pattern)
  );

  if (matches.length === 0) {
    return null;
  }

  // Sort by pattern length (descending) to get most specific match
  matches.sort((a, b) => b.pattern.length - a.pattern.length);

  return matches[0];
}

/**
 * Check if a single user role matches a required role pattern.
 * Supports wildcard patterns like "*.admin" which matches any role ending with ".admin".
 */
function roleMatches(userRole: string, requiredRole: string): boolean {
  if (requiredRole.startsWith("*.")) {
    const suffix = requiredRole.slice(1); // e.g. ".admin"
    return userRole.endsWith(suffix);
  }
  return userRole === requiredRole;
}

/**
 * Check if user has at least one of the required roles for a route
 * Uses OR logic - user needs ANY of the required roles, not all of them
 * Supports wildcard patterns (e.g. "*.admin" matches any role ending with ".admin")
 */
export function hasRequiredRole(
  userRoles: string[],
  requiredRoles: string[]
): boolean {
  // No roles required = public route
  if (requiredRoles.length === 0) {
    return true;
  }

  // Check if user has at least one of the required roles (with pattern support)
  return requiredRoles.some((required) =>
    userRoles.some((userRole) => roleMatches(userRole, required))
  );
}

/**
 * Check if user has ALL of the required roles (AND logic)
 * Use this for routes that require multiple specific roles
 * Supports wildcard patterns (e.g. "*.admin" matches any role ending with ".admin")
 */
export function hasAllRoles(
  userRoles: string[],
  requiredRoles: string[]
): boolean {
  if (requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.every((required) =>
    userRoles.some((userRole) => roleMatches(userRole, required))
  );
}
