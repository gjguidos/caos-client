
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import VAOSLogo from "@/shared/components/VAOSLogo";
import { AppVersion } from "./AppVersion";

const FEATURES = [
  "Custom personalities & tools",
  "Real-time conversations",
  "Easy to use interface",
] as const;

export default function LandingPageBody() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = () => {
    setLoading(true);
    router.push("/agents");
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex w-full max-w-md flex-col items-start gap-4 px-6 py-12">
        <VAOSLogo
          freeZone="default"
          width={100}
          height={40}
          linkToHome={false}
        />

        <AppVersion />

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Build, manage, and chat with AI agents.
        </h1>

        <ul className="space-y-3">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <Check
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="mt-4 w-full"
          onClick={handleGetStarted}
          disabled={loading}
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Opening workspace...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </main>
  );
}
