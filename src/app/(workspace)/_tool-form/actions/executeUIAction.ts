// executeUiAction.ts

import type {
    FormValues,
    ToolOperationBinding,
    UIComponent,
  } from "@/app/(workspace)/_tool-form/toolForm.types";
  
  import type {
    UiActionDefinition,
  } from "./action.types";
  
  import {
    executeOperationCancel,
  } from "./executeOperationCancel";
  
  import {
    executeHttpRequestAction,
  } from "./executeHttpRequestAction";
  
  export type ExecuteOperationCancellation = (
    executeCancel: (
      runId: string
    ) => Promise<void>
  ) => Promise<void>;
  
  export type UiActionExecutionContext = {
    values: FormValues;
  
    state: Record<
      string,
      unknown
    >;
  
    operationBinding?:
      | ToolOperationBinding
      | null;
  
    submitTool?:
      () =>
        void |
        Promise<void>;
    
    cancelOperation?: (
        executeCancel: (
            runId: string
        ) => Promise<void>
        ) => Promise<void>;
  };
  
  export async function executeUiAction(
    component: UIComponent,
    context: UiActionExecutionContext
  ): Promise<void> {
    const action =
      component.props?.action as
        | UiActionDefinition
        | undefined;
  
    if (!action) {
      throw new Error(
        `UI component "${component.id}" has no action definition.`
      );
    }
  
    switch (action.type) {
      case "tool_execute":
        if (!context.submitTool) {
          throw new Error(
            "Tool execution is unavailable."
          );
        }
  
        await context.submitTool();
        return;
  
      case "operation_cancel":
        await executeOperationCancel(
          action,
          context
        );
        return;
  
      case "http_request":
        await executeHttpRequestAction(
          action,
          context
        );
        return;
    }
  }