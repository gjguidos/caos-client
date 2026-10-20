import { UiActionExecutionContext } from "./executeUIAction";
  
  import type {
    UiOperationCancelAction,
  } from "./action.types";
  
  import {
    executeHttpRequestAction,
  } from "./executeHttpRequestAction";
  
  export async function executeOperationCancel(
    _action: UiOperationCancelAction,
    context: UiActionExecutionContext
  ): Promise<void> {
    const binding =
      context.operationBinding;
  
    if (!binding) {
      throw new Error(
        "Operation binding is unavailable."
      );
    }
  
    const cancelAction =
      binding.actions?.cancel;
  
    if (!cancelAction) {
      throw new Error(
        "Operation does not expose a cancel action."
      );
    }
  
    if (!context.cancelOperation) {
      throw new Error(
        "Operation cancellation lifecycle is unavailable."
      );
    }
  
    await context.cancelOperation(
      async (runId) => {
        await executeHttpRequestAction(
          {
            ...cancelAction,
  
            path_params: {
              ...cancelAction.path_params,
  
              run_id: {
                value: runId,
              },
            },
          },
          context
        );
      }
    );
  }