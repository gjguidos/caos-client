"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function FormAgentConnectionStatusSkeleton() {
  return (
    <div className="mb-4 h-4 w-40 flex items-center gap-2">
      <Skeleton className="h-full w-full" />
    </div>
  );
}