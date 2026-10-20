/**
 * The backend wraps every API payload in a `{ success, statusCode, message,
 * data }` envelope. This module is the single canonical place that models that
 * shape and unwraps it, so individual `fetch_*` helpers don't each re-implement
 * the `?.data` extraction with slightly different spellings.
 *
 * The wrapping is applied globally by the backend's `ResponseFormatMiddleware`
 * to every sub-400 response, so a route returning a bare list still reaches the
 * client as `{ ..., data: [...] }`. Reading `?.data` is therefore always
 * correct — do NOT reintroduce defensive bare-array / `{ items }` fallbacks.
 *
 * One nuance: the middleware omits `data` entirely for a falsy body (e.g. an
 * empty list), so an empty collection arrives as `{ success, statusCode,
 * message }` with no `data` key. `unwrapDataArray` maps that to `[]`.
 */

export interface ApiEnvelope<T> {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
}

/** Extract the `data` payload from a backend envelope (`undefined` if absent). */
export function unwrapData<T>(body: unknown): T | undefined {
  return (body as ApiEnvelope<T> | null)?.data;
}

/**
 * Extract a list payload from a backend envelope, always returning an array
 * (`[]` when `data` is absent or not an array). Use for endpoints whose `data`
 * is a collection.
 */
export function unwrapDataArray<T>(body: unknown): T[] {
  const data = unwrapData<T[]>(body);
  return Array.isArray(data) ? data : [];
}
