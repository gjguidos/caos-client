"use client";

import { CopyButton } from "@/shared/components/CopyButton/CopyButton";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import { ResponseActionBar } from "../ResponseActionBar/ResponseActionBar";
import { useRenderPath } from "@/app/(workspace)/_hooks/useRenderPath";
import { useToolForm } from "@/app/(workspace)/_tool-form/hooks/useToolForm";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { ChatMsg } from "../../chat.types";

interface ResponseBubbleProps {
  message: ChatMsg;
  uiComponents?: UIComponent[];
}

export function ResponseBubble({ message, uiComponents }: ResponseBubbleProps) {
  const { setValue, chatInputConfig } = useToolForm();
  const [modeComponent] = useRenderPath(
    "workspace.conversationArea.inputSection.toolMode",
    uiComponents
  );
  const responseActionBar = useRenderPath(
    "workspace.conversationArea.responseCard.responseActionBar",
    uiComponents
  );

  return (
    <MessageBubble
      text={message.text}
      actions={
        <>
          {responseActionBar.map((component) => (
            <ResponseActionBar
              key={component.id}
              component={component}
              onChange={(value) => {
                if (modeComponent) setValue(modeComponent.id, value);
                if (chatInputConfig) setValue(chatInputConfig.id, message.text);
              }}
            />
          ))}
          <CopyButton
            value={message.text}
            label="message"
            className="text-neutral-5"
          />
        </>
      }
    />
  );
}
