// action.types.ts

import type {
    FormScalarValue,
    ToolOperationBinding,
  } from "@/app/(workspace)/_tool-form/toolForm.types";
  
  export type HttpMethod =
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";
  
  export type UiActionValueSource = {
    from_state?: string;
    from_field?: string;
    value?: FormScalarValue;
    transform?: string;
  };
  
  export type UiHttpRequestAction = {
    type: "http_request";
    method: HttpMethod;
    endpoint: string;
  
    body?: Record<
      string,
      UiActionValueSource
    >;
  
    path_params?: Record<
      string,
      UiActionValueSource
    >;
  };
  
  export type UiToolExecuteAction = {
    type: "tool_execute";
    tool_key?: string;
  };
  
  export type UiOperationCancelAction = {
    type: "operation_cancel";
  
    operation_binding?: string;
  };
  
  export type UiActionDefinition =
    | UiHttpRequestAction
    | UiToolExecuteAction
    | UiOperationCancelAction;
  
  export type UiActionRuntime = {
    operationBinding?:
      | ToolOperationBinding
      | null;
  };