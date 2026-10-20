"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function FormAgentResultSkeleton() {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden border-l">
      <header className="border-b px-5">
        <div className="mb-4 h-8 w-40 flex items-center justify-between">

          <Skeleton className="h-full w-full" />
        </div>

        <div className="flex pb-3 w-40 items-center justify-between">
          <Skeleton className="h-full w-[50%]" />
          <Skeleton className="h-full w-[50%]" />
        </div>
      </header>

      <div className="min-h-0 w-[90%] items-center flex-1 overflow-hidden p-5">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />

          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>

          <Skeleton className="h-24 w-full" />

          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>

          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </section>
  );
}