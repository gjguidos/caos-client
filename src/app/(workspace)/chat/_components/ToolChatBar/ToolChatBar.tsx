"use client";

import { useRenderPath } from "@/app/(workspace)/_hooks/useRenderPath";
import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import {
  hasRequiredUIComponentValues,
  serializeUIComponents,
} from "@/app/(workspace)/_tool-form/lib/uiComponentSerializer";
import type {
  FormValues,
  PillGroupProps,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { logger } from "@/shared/lib/logger";
import { MUTED_ACTION } from "./inputBarStyles";
import { Button } from "@/components/ui/button";
import { ArrowUp, BookOpen, FileText, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFileUpload } from "../../_hooks/useFileUpload";
import { useTextareaAutoResize } from "../../_hooks/useTextareaAutoResize";
import type {
  EnrichedTool,
  FilesSupport,
} from "@/app/(workspace)/_types/chat.types";
import type { FileRef } from "@/app/(workspace)/_types/websocket.types";
import { PDFUploadDialog } from "../dialogs/pdfUploadDialog";
import { ResponseActionBar } from "@/app/(workspace)/_components/ResponseActionBar/ResponseActionBar";
import { ComposerFooter } from "./_components/ComposerFooter";
import { FileUploadButton } from "./_components/FileUploadButton";
import { PillGroup } from "./_components/PillGroup";
import { ToolSelector } from "./_components/ToolSelector";

const SLOT_WIDGET_MAP = {
  PillGroup,
  ResponseActionBar,
} as const;

type AttachmentChipProps = {
  filename: string;
  onRemove: () => void;
  disabled?: boolean;
};

function AttachmentChip({ filename, onRemove, disabled = false }: AttachmentChipProps) {
  return (
    <span className="mr-2 inline-flex max-w-[45%] shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground">
      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate" title={filename}>{filename}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-label={`Remove ${filename}`}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

function renderSlotComponents(
  components: UIComponent[],
  values: FormValues,
  setValue: (key: string, value: string | number | string[] | undefined) => void
): ReactNode[] {
  return components
    .map((component) => {
      const Widget =
        SLOT_WIDGET_MAP[component.widget as keyof typeof SLOT_WIDGET_MAP];

      if (!Widget) {
        logger.warn(`Widget "${component.widget}" not implemented`);
        return null;
      }

      return (
        <Widget
          key={component.id}
          component={component}
          value={values?.[component.id] as string}
          onChange={(value: string) => setValue(component.id, value)}
        />
      );
    })
    .filter((node) => node !== null);
}

interface ToolChatBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSubmit: () => void;
  onToolFormSubmit: () => void;
  onToolFormSubmitPartial: () => void;
  onSendWithFiles?: (files: FileRef[], message: string) => void;
  agent_id: string;
  currentCollection?: string | null;
  user_id: string;
  chatIsready: boolean;
  isThinking: boolean;
  tools: EnrichedTool[];
  /** Key of the selected tool, or null for plain chat. */
  currentToolKey: string | null;
  setCurrentToolKey: (key: string | null) => void;
  onFileAttached?: (filename: string) => void;
  onFileDismissed?: () => void;
}

export function ToolChatBar({
  inputText,
  setInputText,
  onSubmit,
  onToolFormSubmit,
  onToolFormSubmitPartial,
  onSendWithFiles,
  agent_id,
  currentCollection,
  user_id,
  chatIsready,
  isThinking,
  currentToolKey,
  setCurrentToolKey,
  tools,
  onFileAttached,
  onFileDismissed,
}: ToolChatBarProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ filename: string } | null>(
    null
  );

  const currentTool = tools.find((t) => t.key === currentToolKey) ?? null;

  // Require onSendWithFiles to be present — if the parent doesn't handle the
  // send, we must not show the file UI or we'd silently swallow the upload.
  const filesSupport: FilesSupport | null = onSendWithFiles
    ? (currentTool?.supports?.files ?? null)
    : null;

  const { pendingFile, isUploading, canAddFile, handleFileSelect, clearFile } =
    useFileUpload({
      selectedToolKey: currentToolKey,
      filesSupport,
    });

  const toolFileInputRef = useRef<HTMLInputElement>(null);

  const currentToolUI = currentTool?.ui;

  // Canonical key used to invoke the tool, sent as the leading @<key> token.
  const toolKey = currentTool?.key ?? null;

  const { values, setValue, chatInputConfig, uiComponents } = useToolForm();

  const toolMode = useRenderPath(
    "workspace.conversationArea.inputSection.toolMode",
    currentToolUI
  );

  const actionBarComponents = useRenderPath(
    "workspace.conversationArea.inputSection.inputActionBar",
    currentToolUI
  );

  const modeComponent = useMemo(
    () => toolMode.find((c) => c.flag_config?.required) ?? null,
    [toolMode]
  );

  const isModeSelected = useMemo(() => {
    if (!modeComponent) return false;
    return !!values?.[modeComponent.id];
  }, [modeComponent, values]);

  const currentModeRequiresInput = useMemo(() => {
    if (!modeComponent) return true;
    const modeValue = values?.[modeComponent.id] as string | undefined;
    if (!modeValue) return true;
    const options =
      (modeComponent.props as unknown as PillGroupProps).options ?? [];
    const current = options.find((o) => o.value === modeValue);
    return current?.requiresInput ?? true;
  }, [modeComponent, values]);

  const showFileUpload = chatInputConfig?.file_upload === true;

  // Sync form value with textarea (bidirectional) — skipped when a file is uploaded
  // to prevent the extracted PDF text from leaking into the visible textarea.
  useEffect(() => {
    if (chatInputConfig && !uploadedFile) {
      const formValue = values?.[chatInputConfig.id];
      const newValue = formValue ? String(formValue) : "";

      if (newValue !== inputText) {
        setInputText(newValue);
      }
    }
  }, [chatInputConfig, values, inputText, setInputText, uploadedFile]);

  const handleTextChange = useCallback(
    (text: string) => {
      if (uploadedFile) {
        setUploadedFile(null);
      }

      setInputText(text);
      if (chatInputConfig) {
        setValue(chatInputConfig.id, text);
      }
    },
    [setInputText, chatInputConfig, setValue, uploadedFile, setUploadedFile]
  );

  const isSubmitDisabled = useMemo(() => {
    if (isThinking || isUploading) return true;

    if (chatInputConfig && currentToolUI) {
      if (!currentModeRequiresInput) {
        return !isModeSelected;
      }

      if (!inputText.trim() && !uploadedFile && !pendingFile) return true;

      const hasRequiredValues = hasRequiredUIComponentValues(
        values,
        currentToolUI,
        chatInputConfig
      );
      return !hasRequiredValues;
    }

    return !inputText.trim() && !pendingFile;
  }, [
    isThinking,
    isUploading,
    chatInputConfig,
    currentToolUI,
    currentModeRequiresInput,
    isModeSelected,
    inputText,
    values,
    uploadedFile,
    pendingFile,
  ]);

  const handleDismissFile = () => {
    setUploadedFile(null);
    onFileDismissed?.();
    if (chatInputConfig) {
      setValue(chatInputConfig.id, "");
    }
  };

  const handleSubmit = () => {
    if (isSubmitDisabled) return;

    if (pendingFile && onSendWithFiles) {
      const message =
        chatInputConfig && uiComponents
          ? serializeUIComponents(
              values,
              uiComponents,
              chatInputConfig,
              toolKey
            )
          : inputText;
      onSendWithFiles([pendingFile], message);
      clearFile();
      if (chatInputConfig) {
        setValue(chatInputConfig.id, "");
      }
      return;
    }

    if (chatInputConfig) {
      if (!currentModeRequiresInput) {
        onToolFormSubmitPartial();
      } else {
        onToolFormSubmit();
      }
      setUploadedFile(null);
    } else {
      onSubmit();
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxRows = 12;
  const handleResize = useTextareaAutoResize(textareaRef, inputText, maxRows);

  const getPlaceholder = () => {
    if (chatInputConfig?.placeholder) {
      return chatInputConfig.placeholder;
    }

    return chatIsready
      ? "Ask your agent anything..."
      : "Connecting to agent… You can type once the connection is ready.";
  };

  const handleChatInput = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      handleResize(e.target);
      handleTextChange(e.target.value);
    },
    [handleResize, handleTextChange]
  );

  return (
    <div className="flex flex-col">
      {toolMode.length > 0 && (
        <div className="mb-3">
          {renderSlotComponents(toolMode, values, setValue)}
        </div>
      )}
      <div className="relative flex w-full flex-col gap-3 rounded-[20px] border border-border bg-card py-4 shadow-sm">
        {/* Textarea row. The cap is viewport-aware: a fixed row count lets a long
            draft grow the composer past the bottom of a short window, taking the
            transcript to nothing and pushing the footer off screen. */}
        <div className="flex max-h-[min(384px,35vh)] min-h-10 w-full items-center overflow-y-auto px-4">
          {uploadedFile && showFileUpload && (
            <AttachmentChip
              filename={uploadedFile.filename}
              onRemove={handleDismissFile}
            />
          )}
          {pendingFile && filesSupport && (
            <AttachmentChip
              filename={pendingFile.name}
              onRemove={clearFile}
              disabled={isUploading}
            />
          )}
          <textarea
            ref={textareaRef}
            rows={1}
            className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 text-base leading-6 text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ height: "auto" }}
            placeholder={uploadedFile ? "" : getPlaceholder()}
            value={inputText}
            onChange={handleChatInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
                // Reset height after submit
                e.currentTarget.style.height = "auto";
              }
            }}
          />
        </div>

        {/* Action bar row - sized to its controls, which are all xsmall (32px). */}
        <div className="flex min-h-8 w-full items-center justify-between px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {showFileUpload && chatInputConfig && (
              <FileUploadButton
                inputId={chatInputConfig.id}
                onChange={(value) => setValue(chatInputConfig.id, value)}
                onFilename={(filename) => {
                  setUploadedFile({ filename });
                  onFileAttached?.(filename);
                }}
              />
            )}
            {filesSupport && (
              <>
                <input
                  ref={toolFileInputRef}
                  type="file"
                  accept={filesSupport.accepted_mimes?.join(",") ?? undefined}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileSelect(file);
                    e.target.value = "";
                  }}
                  className="hidden"
                  disabled={isThinking || !canAddFile}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toolFileInputRef.current?.click()}
                  disabled={isThinking || !canAddFile || isUploading}
                  aria-label={isUploading ? "Uploading attachment" : "Attach file"}
                  className={`size-8 ${MUTED_ACTION}`}
                >
                  {isUploading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Paperclip className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </>
            )}
            {tools.length > 0 && (
              <ToolSelector
                tools={tools}
                currentTool={currentTool}
                onSelect={setCurrentToolKey}
              />
            )}
            {actionBarComponents.length > 0 &&
              renderSlotComponents(actionBarComponents, values, setValue)}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center"
              aria-busy={isThinking}
              aria-label={isThinking ? "Sending message..." : "Send message"}
            >
              <Button
                type="button"
                onClick={handleSubmit}
                size="icon"
                className="size-8 rounded-full"
                disabled={isSubmitDisabled || isThinking}
                aria-label="Send message"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
        {currentCollection && (
          <>
            <div className="flex items-center gap-3 border-t border-border px-3 py-2">
              <div className="flex min-w-0 items-center gap-1 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4" />
                {currentCollection}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setShowUploadDialog(true)}
                aria-label={`Upload PDF to ${currentCollection}`}
              >
                <UploadCloud className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <PDFUploadDialog
              open={showUploadDialog}
              onClose={() => setShowUploadDialog(false)}
              collectionName={currentCollection}
              agent_id={agent_id}
              user_id={user_id}
            />
          </>
        )}
      </div>
      <ComposerFooter />
    </div>
  );
}
