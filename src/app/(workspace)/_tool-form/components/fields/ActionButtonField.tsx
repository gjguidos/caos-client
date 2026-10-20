"use client";

import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

export type ActionButtonStatus =
  | "idle"
  | "loading"
  | "waiting"
  | "success"
  | "error";

export type ButtonVariant = ComponentProps<typeof Button>["variant"];

export type ActionButtonLabels = Partial<Record<ActionButtonStatus, string>>;

interface ActionButtonFieldProps {
  id: string;
  label: string;
  description?: string;
  helperText?: string;
  disabled?: boolean;
  status?: ActionButtonStatus;
  statusMessage?: string;
  labels?: ActionButtonLabels;
  variant?: ButtonVariant;
  onClick: () => void | Promise<void>;
}

const DEFAULT_LABELS: Record<ActionButtonStatus, string> = {
  idle: "",
  loading: "Working...",
  waiting: "Waiting...",
  success: "Done",
  error: "Try again",
};

export function ActionButtonField({
  id,
  label,
  description,
  helperText,
  disabled = false,
  status = "idle",
  statusMessage,
  labels,
  variant = "secondary",
  onClick,
}: ActionButtonFieldProps) {
  const isBusy = status === "loading" || status === "waiting";

  const buttonLabel =
    labels?.[status] ?? (status === "idle" ? label : DEFAULT_LABELS[status]);

  return (
    <div className="rounded-md border border-neutral-3 bg-neutral-1 p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-1">{label}</p>

          {description ? (
            <p className="mt-1 text-xs text-text-2">{description}</p>
          ) : null}

          {helperText ? (
            <p className="mt-1 text-xs text-text-2">{helperText}</p>
          ) : null}

          {statusMessage ? (
            <p
              className="mt-2 text-xs text-text-2"
              role={status === "error" ? "alert" : "status"}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>

        <Button
          id={id}
          type="button"
          variant={variant}
          disabled={disabled || isBusy || status === "success"}
          onClick={() => {
            void onClick();
          }}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
