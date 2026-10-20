"use server";

import { getServerSession } from "@/shared/auth/lib/session";
import { getApiAccessToken } from
  "@/shared/auth/lib/get-api-token";
import { logger } from "@/shared/lib/logger";
import readPublicEnv from "@/shared/lib/publicEnv";

/**
 * Server-only fetch helpers
 *
 * - JSON helper:  fetchData()
 * - Raw helper:   fetchDataRaw()  (returns the native Response for streams/headers)

 */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type HeadersLike = Record<string, string>;
// Accept any plain object (interfaces lack an index signature, so they are not
// assignable to `Record<string, unknown>`) or FormData. Callers serialize to JSON
// or query params; no call site needs to cast its typed body.
type DataLike = object | FormData;

interface BaseOptions {
  path: string;
  method?: HttpMethod;
  headers?: HeadersLike;
  data?: DataLike;
  requireAuth?: boolean;
  timeoutMs?: number;
}

/** Bounds/defaults for request timeouts, so caller-supplied values stay in a safe range. */
const DEFAULT_TIMEOUT_MS = 15_000;
const MIN_TIMEOUT_MS = 1;
const MAX_TIMEOUT_MS = 60_000;

/**
 * Coerce a caller-supplied timeout into a bounded, finite integer. `timeoutMs`
 * is user-controlled, so an out-of-range or non-finite value would otherwise
 * let a timer (and its pending request) live for an arbitrarily long time.
 */
function normalizeTimeoutMs(
  value: number | undefined,
  fallback = DEFAULT_TIMEOUT_MS
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.trunc(value);
  if (rounded < MIN_TIMEOUT_MS) return MIN_TIMEOUT_MS;
  if (rounded > MAX_TIMEOUT_MS) return MAX_TIMEOUT_MS;
  return rounded;
}

/** Create a timeout signal that prefers AbortSignal.timeout() and falls back to AbortController. */
function createTimeoutSignal(ms: number): AbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }

  // Fallback: manual AbortController + setTimeout
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  ac.signal.addEventListener("abort", () => clearTimeout(t), { once: true });
  return ac.signal;
}

/**
 * Resolve the origins this server is allowed to call, as parsed `URL`s. Callers
 * always build `path` from the configured API base (`NEXT_PUBLIC_API_BASE`), so
 * the allowlist is exactly that origin. Returning the parsed `URL` lets the
 * caller rebuild the request from this server-controlled origin instead of from
 * the (user-influenced) requested URL.
 */
function allowedBases(): URL[] {
  const bases: URL[] = [];
  const base = readPublicEnv().NEXT_PUBLIC_API_BASE;
  if (base) {
    try {
      bases.push(new URL(base));
    } catch {
      /* malformed base — ignore, leaving it off the allowlist */
    }
  }
  return bases;
}

/** Append query params, preserving arrays as repeated keys (?tags=a&tags=b). */
function appendQueryParams(url: string, data?: Record<string, unknown>) {
  if (!data || !Object.keys(data).length) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    if (Array.isArray(v)) for (const item of v) params.append(k, String(item));
    else params.append(k, String(v));
  }
  const qs = params.toString();
  if (!qs) return url;
  return url + (url.includes("?") ? "&" : "?") + qs;
}

/** Assemble headers, adding Bearer token when required. */
async function buildHeaders(
  requireAuth: boolean,
  baseHeaders: HeadersLike,
  isFormData: boolean
): Promise<HeadersLike> {
  let auth: HeadersLike = {};
  if (requireAuth) {
    const session = await getServerSession();
    if (!session) throw new Error("AUTHENTICATION_REQUIRED");
    const token = await getApiAccessToken(session);
    auth = { Authorization: `Bearer ${token}` };
  }

  return isFormData
    ? { ...auth, ...baseHeaders }
    : {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...auth,
        ...baseHeaders,
      };
}

/**
 * Build and send the request, returning the raw `Response` plus the resolved
 * `url` (path + any query params, for error logging). Does NOT inspect the HTTP
 * status — only network/auth failures throw. The single place that knows how to
 * assemble a request; `fetchDataRaw`/`fetchData`/`fetchDataResult` build on it.
 */
async function executeRequest(
  opts: BaseOptions
): Promise<{ response: Response; url: string }> {
  const {
    path,
    method = "GET",
    headers = {},
    data = {},
    requireAuth = true,
    timeoutMs,
  } = opts;

  const isFormData =
    typeof FormData !== "undefined" && data instanceof FormData;

  let url = path;
  let body: BodyInit | undefined;
  if (method === "GET" && !isFormData && data && Object.keys(data).length > 0) {
    url = appendQueryParams(url, data as Record<string, unknown>);
  } else if (isFormData) {
    body = data as FormData;
  } else if (data && Object.keys(data).length > 0) {
    body = JSON.stringify(data);
  }

  // Guard against request forgery: user input is interpolated into `path` by
  // callers, so the assembled URL must be absolute and target a configured API
  // origin before we hand it to `fetch` — the single network sink.
  let requested: URL;
  try {
    requested = new URL(url);
  } catch {
    throw new Error(`Refusing to fetch non-absolute URL: ${url}`);
  }
  const allowed = allowedBases().find((b) => b.origin === requested.origin);
  if (!allowed) {
    throw new Error(`Refusing to fetch disallowed origin: ${requested.origin}`);
  }

  // Rebuild the URL from the server-controlled base origin. The protocol, host,
  // and port now come from `NEXT_PUBLIC_API_BASE` — never from the requested
  // URL — so user input can only influence the path/query, not the request
  // target. `URL` also normalizes any "../" segments, so path traversal cannot
  // redirect the request off the configured API.
  const target = new URL(allowed.origin);
  target.pathname = requested.pathname;
  target.search = requested.search;

  const hdrs = await buildHeaders(requireAuth, headers, isFormData);
  const signal = createTimeoutSignal(normalizeTimeoutMs(timeoutMs));

  try {
    const response = await fetch(target, {
      cache: "no-store",
      method,
      headers: hdrs,
      body: method === "GET" ? undefined : body,
      signal,
    });
    return { response, url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      `[server-actions/fetch] network error fetching ${url}: ${msg}`
    );
    throw new Error(`Network error when fetching ${url}: ${msg}`);
  }
}

/** Raw Response variant – use when you need streams/headers, or custom body handling. */
export async function fetchDataRaw(opts: BaseOptions): Promise<Response> {
  const { response, url } = await executeRequest(opts);

  if (!response.ok) {
    // Read text once; try to extract message if JSON
    const text = await response.text().catch(() => "");
    let msg: string | undefined;
    try {
      const j = JSON.parse(text || "null");
      msg = j?.message ?? j?.error ?? undefined;
    } catch {
      /* not JSON */
    }

    logger.error(
      `[server-actions/fetch] non-OK ${response.status} from ${url}: ${msg ?? text}`
    );

    throw new Error(
      msg
        ? `Request failed: ${msg}`
        : `Request failed with status ${response.status}${text ? `: ${text}` : ""}`
    );
  }

  return response;
}

/** JSON convenience helper – parses JSON, returns null for 204. */
export default async function fetchData<T = unknown>(
  opts: BaseOptions
): Promise<T | null> {
  const res = await fetchDataRaw(opts);
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

/** Outcome of a non-throwing request: status plus the parsed JSON body. */
export interface FetchResult<T = unknown> {
  ok: boolean;
  status: number;
  body: T | null;
}

/**
 * Non-throwing JSON request. Unlike `fetchData`/`fetchDataRaw`, this does NOT
 * throw on a non-2xx response — it returns the parsed error envelope so callers
 * can branch on a structured `error_code` (e.g. workflow `422` validation errors,
 * which `fetchDataRaw` would otherwise collapse into a generic Error message).
 *
 * Network/auth failures still throw. `204` yields a `null` body.
 */
export async function fetchDataResult<T = unknown>(
  opts: BaseOptions
): Promise<FetchResult<T>> {
  const { response } = await executeRequest(opts);

  if (response.status === 204) {
    return { ok: response.ok, status: response.status, body: null };
  }

  const text = await response.text().catch(() => "");
  let parsed: T | null = null;
  try {
    parsed = text ? (JSON.parse(text) as T) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, status: response.status, body: parsed };
}
