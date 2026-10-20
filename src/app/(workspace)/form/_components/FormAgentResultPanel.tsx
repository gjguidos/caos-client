
"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { AgentMessage } from "@/app/(workspace)/_components/AgentMessage/AgentMessage";
import { ResponseBubble } from "@/app/(workspace)/_components/ResponseBubble/ResponseBubble";
import { CrawlerLoadingState } from "../../_roles/crawler/_components/CrawlerLoadingState";
import { getWidget } from "@/app/(workspace)/_components/widgets/widgetRegistry";

import type { ChatMsg } from "@/app/(workspace)/_types/chat.types";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { OperationEventData } from "@/app/(workspace)/_types/event.types";

type ResultTab = "result" | "events";

export function FormAgentResultPanel({
  title = "Result",
  emptyText = "Configure the form and run the operation.",
  runningText = "The agent is processing the request.",
  status,
  isRunning,
  logs,
  messages,
  operation,
  uiComponents,
  agentType,
}: {
  title?: string;
  emptyText?: string;
  runningText?: string;
  status: string;
  isRunning: boolean;
  logs: string[];
  messages: ChatMsg[];
  operation?: OperationEventData | null;
  uiComponents?: UIComponent[];
  agentType: string;
}) {
  const [activeTab, setActiveTab] = useState<ResultTab>("result");

  return (
    <section className="flex min-h-0 flex-col overflow-hidden border-l border-border bg-background">
      <header className="shrink-0 border-b border-border px-5 pt-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              {title}
            </h2>

            <p className="text-sm text-muted-foreground">
              Status: {status}
            </p>
          </div>

          {isRunning && (
            <Loader2
              className="size-5 shrink-0 animate-spin text-primary"
              aria-label="Operation running"
              role="status"
            />
          )}
        </div>

        <div
          role="tablist"
          aria-label="Operation result"
          className="flex items-center gap-6"
        >
          <TabButton
            id="result"
            active={activeTab === "result"}
            onClick={() => setActiveTab("result")}
          >
            Result
          </TabButton>

          <TabButton
            id="events"
            active={activeTab === "events"}
            onClick={() => setActiveTab("events")}
          >
            Events

            {logs.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {logs.length}
              </span>
            )}
          </TabButton>
        </div>
      </header>

      <div
        id={`form-agent-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`form-agent-tab-${activeTab}`}
        className="min-h-0 flex-1 overflow-y-auto p-5"
      >
        {activeTab === "result" ? (
          <ResultContent
            emptyText={emptyText}
            runningText={runningText}
            isRunning={isRunning}
            messages={messages}
            operation={operation}
            uiComponents={uiComponents}
            agentType={agentType}
          />
        ) : (
          <EventsContent
            logs={logs}
            isRunning={isRunning}
          />
        )}
      </div>
    </section>
  );
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: ResultTab;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      id={`form-agent-tab-${id}`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`form-agent-panel-${id}`}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={[
        "inline-flex items-center border-b-2 pb-3 text-sm font-medium",
        "transition-colors focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "focus-visible:ring-offset-2",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ResultContent({
  emptyText,
  runningText,
  isRunning,
  messages,
  operation,
  uiComponents,
  agentType,
}: {
  emptyText: string;
  runningText: string;
  isRunning: boolean;
  messages: ChatMsg[];
  operation?: OperationEventData | null;
  uiComponents?: UIComponent[];
  agentType: string;
}) {
  if (!isRunning && messages.length === 0) {
    return (
      <div className="rounded-md bg-muted/50 p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  if (isRunning && messages.length === 0) {
    return (
      <CrawlerLoadingState
        text={runningText}
        operation={operation}
      />
    );
  }

  return (
    <div className="animate-result-enter space-y-4">
      {messages.map((message, index) => (
        <div key={index}>
          {renderFormAgentMessage({
            message,
            uiComponents,
            agentType,
          })}
        </div>
      ))}
    </div>
  );
}

function EventsContent({
  logs,
  isRunning,
}: {
  logs: string[];
  isRunning: boolean;
}) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md bg-muted/50 p-8 text-center text-sm text-muted-foreground">
        {isRunning
          ? "Execution events will appear here as the operation runs."
          : "No execution events available."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, index) => (
        <pre
          key={index}
          className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-mono text-xs text-foreground/80"
        >
          {log}
        </pre>
      ))}
    </div>
  );
}

function renderFormAgentMessage({
  message,
  uiComponents,
  agentType,
}: {
  message: ChatMsg;
  uiComponents?: UIComponent[];
  agentType: string;
}) {
  const WidgetComponent =
    message.widget && getWidget(message.widget.type);

  if (message.widget && WidgetComponent) {
    return (
      <AgentMessage source={agentType}>
        <WidgetComponent data={message.widget.data} />
      </AgentMessage>
    );
  }

  if (message.text) {
    return (
      <AgentMessage source={agentType}>
        <ResponseBubble
          message={message}
          uiComponents={uiComponents}
        />
      </AgentMessage>
    );
  }

  return null;
}
