"use client";

import { Alert, AlertDescription } from "@/shared/components/Alert/Alert";
import { useAuth } from "@/shared/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface BuilderAccessGateProps {
  /** Plural resource noun used in the gate copy, e.g. "agents" or "workflows". */
  resource: string;
  /** Where the "Back" button on the no-access fallback should navigate. */
  backHref: string;
  /** Label for that "Back" button, e.g. "Back home" or "Back to dashboard". */
  backLabel: string;
  children: ReactNode;
}

/**
 * Gates the build-mode surfaces behind sign-in + the `canCreateAgent` role.
 *
 * Middleware already blocks these routes at the edge; this is the in-component
 * fallback the agent wizard, the agent editor, the workflow catalog and the
 * workflow builder render when a session is missing or under-privileged.
 * Renders `children` only when access is granted.
 *
 * Copy is deliberately verb-neutral ("build") so the same gate covers creating,
 * editing and browsing without a per-call-site verb.
 *
 * Note: there is no separate workflow permission yet, so workflow creation
 * reuses the agent-create gate (`canCreateAgent`).
 */
export function BuilderAccessGate({
  resource,
  backHref,
  backLabel,
  children,
}: Readonly<BuilderAccessGateProps>) {
  const router = useRouter();
  const { userId, canCreateAgent } = useAuth();

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold">
            Authentication Required
          </h1>
          <p className="mb-6 text-gray-600">
            Please sign in to build {resource}
          </p>
          <Button onClick={() => router.push("/api/auth/login")} size="lg">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!canCreateAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-xl space-y-4 rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">
            You need admin access to build {resource}
          </h1>
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription>
              You must be a group admin or superadmin. Ask your team admin to
              add you to an *.admin role, or contact the platform owner.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push(backHref)}>
              {backLabel}
            </Button>
            <Button
              variant="secondary"
              onClick={() => globalThis.location.reload()}
            >
              Refresh roles
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
