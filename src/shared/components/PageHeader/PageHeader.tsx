
import type { ReactNode } from "react";

import { Eyebrow } from "@/shared/components/Eyebrow/Eyebrow";

interface PageHeaderProps {
  /**
   * Names the section the page belongs to, e.g. "Agents".
   * Omitted when the section and title would be redundant.
   */
  eyebrow?: string;

  /** Main page heading. */
  title: string;

  /** Optional actions displayed alongside the title. */
  actions?: ReactNode;

  /** Optional search or filtering controls below the heading. */
  search?: ReactNode;
}

/**
 * Shared page header for catalogs and individual resources.
 *
 * The eyebrow identifies the section.
 * The title identifies the current page or resource.
 *
 * Actions and search controls are supplied by the caller.
 */
export function PageHeader({
  eyebrow,
  title,
  actions,
  search,
}: Readonly<PageHeaderProps>) {
  return (
    <header className="mb-8 flex w-full flex-col gap-6">
      <div className="flex w-full min-w-0 max-w-[900px] items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow && (
            <Eyebrow size="section">
              {eyebrow}
            </Eyebrow>
          )}

          <h1
            className="truncate text-2xl font-semibold tracking-tight text-foreground"
            title={title}
          >
            {title}
          </h1>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {search}
    </header>
  );
}
