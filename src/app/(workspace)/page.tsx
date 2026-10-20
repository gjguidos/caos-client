"use client";

import LandingPageBody from "@/app/(workspace)/_components/LandingPageBody";
import { ExploreAgents } from "@/app/(workspace)/_components/ExploreAgents";
import { useAuth } from "@/shared/auth/hooks/useAuth";

export default function LandingPage() {
  const { userId } = useAuth();
  return userId ? <ExploreAgents /> : <LandingPageBody />;
}
