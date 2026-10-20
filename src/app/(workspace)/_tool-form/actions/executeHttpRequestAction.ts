// executeHttpRequestAction.ts

import {
    getPublicApiBase,
  } from "@/shared/lib/getApiClient";
  
  import fetchData from "@/shared/lib/server-actions";
  
  import type {
    FormValues,
  } from "@/app/(workspace)/_tool-form/toolForm.types";
  
  import type {
    UiHttpRequestAction,
    UiActionValueSource,
  } from "./action.types";
  
  type ActionState =
    Record<string, unknown>;
  
  export async function executeHttpRequestAction(
    action: UiHttpRequestAction,
    context: {
      values: FormValues;
      state: ActionState;
    }
  ): Promise<unknown> {
    const BASE = getPublicApiBase();
  
    if (!BASE) {
      throw new Error(
        "Missing NEXT_PUBLIC_API_BASE in environment"
      );
    }
  
    const endpoint =
      resolveEndpoint(
        action.endpoint,
        action.path_params,
        context
      );
  
    const data =
      resolveObjectValues(
        action.body,
        context
      );
  
    const path =
      `${BASE.replace(/\/$/, "")}` +
      `${endpoint.startsWith("/") ? "" : "/"}` +
      endpoint;
  
    return await fetchData({
      path,
      method: action.method,
      data,
    });
  }
  
  function resolveEndpoint(
    template: string,
    params:
      | Record<
          string,
          UiActionValueSource
        >
      | undefined,
    context: {
      values: FormValues;
      state: ActionState;
    }
  ): string {
    let resolved = template;
  
    for (
      const [key, source]
      of Object.entries(params ?? {})
    ) {
      const value =
        resolveActionValue(
          source,
          context
        );
  
      if (
        value === undefined ||
        value === null
      ) {
        throw new Error(
          `Could not resolve action path parameter "${key}".`
        );
      }
  
      resolved = resolved.replaceAll(
        `{${key}}`,
        encodeURIComponent(
          String(value)
        )
      );
    }
  
    return resolved;
  }
  
  function resolveObjectValues(
    sources:
      | Record<
          string,
          UiActionValueSource
        >
      | undefined,
    context: {
      values: FormValues;
      state: ActionState;
    }
  ): Record<string, unknown> {
    if (!sources) {
      return {};
    }
  
    return Object.fromEntries(
      Object.entries(sources)
        .map(([key, source]) => [
          key,
          resolveActionValue(
            source,
            context
          ),
        ])
        .filter(
          ([, value]) =>
            value !== undefined
        )
    );
  }
  
  function resolveActionValue(
    source: UiActionValueSource,
    context: {
      values: FormValues;
      state: ActionState;
    }
  ): unknown {
    if (
      source.value !== undefined
    ) {
      return source.value;
    }
  
    if (source.from_field) {
      return context.values[
        source.from_field
      ];
    }
  
    if (source.from_state) {
      return getNestedValue(
        context.state,
        source.from_state
      );
    }
  
    return undefined;
  }
  
  export function getNestedValue(
    source: unknown,
    path: string
  ): unknown {
    return path
      .split(".")
      .reduce<unknown>(
        (current, segment) => {
          if (
            !current ||
            typeof current !== "object"
          ) {
            return undefined;
          }
  
          return (
            current as Record<
              string,
              unknown
            >
          )[segment];
        },
        source
      );
  }