"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function FormAgentWorkspace({
  title,
  description,
  loading = false,
  connectionStatus,
  details,
  form,
  result,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  connectionStatus?: ReactNode;
  details?: ReactNode;
  form: ReactNode;
  result: ReactNode;
}) {
  return (
    <div className="animate-result-enter flex h-full w-full flex-col px-6 py-4">
      <header className="flex min-h-[72px] items-center justify-between gap-4 py-4">
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="animate-result-enter space-y-2">
              <div className="h-7 w-48">
                <Skeleton className="h-full w-full" />
              </div>

              <div className="h-4 w-80 max-w-full">
                <Skeleton className="h-full w-full" />
              </div>
            </div>
          ) : (
            <div className="animate-result-enter">
              <h1 className="text-2xl font-semibold">
                {title}
              </h1>

              {description && (
                <p className="mt-1 text-sm text-gray-600">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {!loading && details}
      </header>

      {connectionStatus}

      <main className="animate-result-enter grid min-h-0 flex-1 gap-6 overflow-hidden pb-6 lg:grid-cols-[520px_minmax(0,1fr)]">
        {form}
        {result}
      </main>
    </div>
  );
}