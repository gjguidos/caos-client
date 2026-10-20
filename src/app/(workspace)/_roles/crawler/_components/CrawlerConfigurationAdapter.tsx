"use client";

import type {
  FormRoleConfigurationProps,
} from "@/app/(workspace)/_agent-runtime/lib/formRoleResolver";

import type {
  ActionButtonStatus,
} from "@/app/(workspace)/_tool-form/components/fields/ActionButtonField";

import {
  CrawlerConfigurationForm,
} from "./CrawlerConfigurationForm";

export function CrawlerConfigurationAdapter({
  tool,
  values,
  setValue,

  formError,
  executionError,

  isRunning,
  operationStatus,
  canExecute,
  hasResultOrLogs,

  supportsBrowserSession,
  browserSession,

  onSubmit,

  cancelOperation,

  onStartBrowserSession,
  onCaptureBrowserSession,

  onReset,
}: FormRoleConfigurationProps) {
  return (
    <CrawlerConfigurationForm
      crawlerToolDef={tool}

      values={values}
      setValue={setValue}

      formError={formError}
      crawlerError={executionError}

      isRunning={isRunning}
      operationStatus={
        operationStatus
      }
      canExecute={canExecute}

      cancelOperation={
        cancelOperation
      }

      hasResultOrLogs={
        hasResultOrLogs
      }

      requiresBrowserSession={
        supportsBrowserSession
      }

      browserSession={
        browserSession
      }

      browserActionStatus={
        browserActionStatus(
          browserSession
        )
      }

      browserActionMessage={
        browserActionMessage(
          browserSession
        )
      }

      onSubmit={onSubmit}

      onStartBrowserSession={
        onStartBrowserSession
      }

      onCaptureBrowserSession={
        onCaptureBrowserSession
      }

      onReset={onReset}
    />
  );
}

type BrowserSessionState =
  FormRoleConfigurationProps[
    "browserSession"
  ];

function browserActionStatus(
  session: BrowserSessionState
): ActionButtonStatus {
  if (session?.ready) {
    return "success";
  }

  if (session?.isStarting) {
    return "loading";
  }

  if (session?.hasSession) {
    return "waiting";
  }

  return "idle";
}

function browserActionMessage(
  session: BrowserSessionState
): string | undefined {
  if (session?.error) {
    return session.error;
  }

  if (session?.ready) {
    return "Signed in. Ready to run.";
  }

  if (session?.hasSession) {
    return (
      "Complete sign-in in the browser window."
    );
  }

  return undefined;
}