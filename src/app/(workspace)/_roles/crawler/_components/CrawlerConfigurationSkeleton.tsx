
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CrawlerConfigurationSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 pb-4">
          <div className="agent-wizard-card space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>

            {/* Target */}
            <section className="space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>

              <Skeleton className="h-12 w-full rounded-md" />

              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </section>

            {/* Preset */}
            <section className="space-y-3 border-t border-border pt-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </section>

            {/* Search */}
            <section className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-52 max-w-full" />
                </div>

                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </section>

            {/* Advanced */}
            <section className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64 max-w-full" />
                </div>

                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
