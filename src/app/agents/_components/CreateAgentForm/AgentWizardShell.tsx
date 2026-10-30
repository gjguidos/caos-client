"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, List, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import "./agentWizard.css";
import MenuNav from "./sections/MenuNav";

import {
  MENU_META,
  MENU_ORDER,
  type MenuSection,
  type StepStatus,
} from "./sections/wizardSteps";

type Connection = {
  ok: boolean;
  label: string;
};

interface AgentWizardShellProps {
  navigationMode?: "wizard" | "settings";
  title: string;

  /** Label the exit by its destination, e.g. "Back to Planner". */
  breadcrumb?: string;

  /** Where the exit leads. */
  backHref: string;

  selected: MenuSection;
  onSelect: (sec: MenuSection) => void;

  /** Rail markers, keyed by step. */
  stepStatus?: Partial<Record<MenuSection, StepStatus>>;

  /**
   * Submit action for the final step's footer on smaller screens.
   * The spec sheet owns the primary submit on desktop.
   */
  submitAction?: ReactNode;

  connection?: Connection;
  onViewLogs?: () => void;

  children: ReactNode;
  summary: ReactNode;
}

export default function AgentWizardShell({
  navigationMode = "wizard",
  title,
  breadcrumb = "Back",
  backHref,
  selected,
  onSelect,
  stepStatus,
  submitAction,
  connection,
  onViewLogs,
  children,
  summary,
}: AgentWizardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const idx = MENU_ORDER.indexOf(selected);
  const stepNum = idx + 1;
  const hasPrev = idx > 0;
  const isLast = idx === MENU_ORDER.length - 1;

  const nextLabel = !isLast ? MENU_META[MENU_ORDER[idx + 1]].label : "";

  const goPrev = () => {
    if (hasPrev) {
      onSelect(MENU_ORDER[idx - 1]);
    }
  };

  const goNext = () => {
    if (!isLast) {
      onSelect(MENU_ORDER[idx + 1]);
    }
  };

  return (
    <div className="agent-wizard flex h-screen w-full flex-col overflow-hidden border-t-2 border-t-primary bg-muted text-foreground">
      {/* Header */}
      <header className="flex h-[68px] flex-none items-center justify-between border-b border-border bg-card px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href={backHref}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {breadcrumb}
            </Link>
          </Button>

          <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {connection && (
            <div
              className="hidden items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-xs text-muted-foreground sm:flex"
              role="status"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  connection.ok ? "bg-emerald-500" : "bg-destructive"
                }`}
                aria-hidden="true"
              />

              <span>{connection.label}</span>
            </div>
          )}

          {onViewLogs && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewLogs}
            >
              <List className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">View logs</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="agent-wizard-mobile-nav"
            onClick={() => setMobileNavOpen((current) => !current)}
            className="size-9 md:hidden"
          >
            {mobileNavOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        {/* Desktop navigation rail */}
        <nav
          className="hidden w-[272px] flex-none flex-col border-r border-border bg-card md:flex"
          aria-label="Agent configuration steps"
        >
          <MenuNav
            settings={navigationMode === "settings"}
            selected={selected}
            onSelect={onSelect}
            status={stepStatus}
          />
        </nav>

        {/* Mobile navigation overlay */}
        {mobileNavOpen && (
          <nav
            id="agent-wizard-mobile-nav"
            aria-label="Agent configuration steps"
            className="absolute inset-x-0 top-0 z-20 border-b border-border bg-card shadow-lg md:hidden"
          >
            <MenuNav
              settings={navigationMode === "settings"}
              selected={selected}
              onSelect={(section) => {
                onSelect(section);
                setMobileNavOpen(false);
              }}
              status={stepStatus}
            />
          </nav>
        )}

        {/* Main form */}
        <main className="agent-wizard-scroll agent-wizard-fields min-w-0 flex-1 overflow-y-auto px-6 py-8 md:px-11">
          <div className="mx-auto max-w-[760px]">
            {children}

            {/* Navigation footer */}
            {navigationMode === "wizard" && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="shrink-0 text-xs text-muted-foreground">
                  Step {stepNum} of {MENU_ORDER.length}
                </span>

                <div className="flex items-center gap-2.5">
                  {hasPrev && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={goPrev}
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Back
                    </Button>
                  )}

                  {!isLast && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={goNext}
                    >
                      Next: {nextLabel}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  )}

                  {isLast && submitAction && (
                    <div className="flex items-center gap-3 lg:hidden">
                      {submitAction}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Summary panel */}
        <aside className="hidden w-[368px] flex-none flex-col border-l border-border bg-card lg:flex">
          {summary}
        </aside>
      </div>
    </div>
  );
}
