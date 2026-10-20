import { getServerSession } from "@/shared/auth/lib/session";
import { getApiAccessToken } from
  "@/shared/auth/lib/get-api-token";
import { getPublicApiBase } from "@/shared/lib/getApiClient";
import { logger } from "@/shared/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const deliveryUrl = request.nextUrl.searchParams.get("url");

    if (!deliveryUrl) {
      return NextResponse.json(
        { error: "Invalid delivery URL" },
        { status: 400 }
      );
    }

    const apiBase = getPublicApiBase();

    if (!apiBase) {
      return NextResponse.json(
        {
          error: "Missing NEXT_PUBLIC_API_BASE in environment",
        },
        { status: 500 }
      );
    }

    const token = await getApiAccessToken(session);

    const backend = new URL(apiBase);

    // Accept only same-origin API paths. The query parameter is user
    // controlled, so validate the fully parsed URL before it can be fetched.
    // This also rejects protocol-relative URLs, backslash URL tricks, and
    // paths that normalize outside /api/.
    let requestedUrl: URL;
    try {
      requestedUrl = new URL(deliveryUrl, backend.origin);
    } catch {
      return NextResponse.json(
        { error: "Invalid delivery URL" },
        { status: 400 }
      );
    }

    if (
      !deliveryUrl.startsWith("/api/") ||
      deliveryUrl.startsWith("//") ||
      deliveryUrl.includes("\\") ||
      requestedUrl.origin !== backend.origin ||
      !requestedUrl.pathname.startsWith("/api/") ||
      requestedUrl.username !== "" ||
      requestedUrl.password !== ""
    ) {
      return NextResponse.json(
        { error: "Invalid delivery URL" },
        { status: 400 }
      );
    }

    // Build the fetch target from the configured backend origin. Only the
    // validated API path and query are carried over from the request.
    const upstreamUrl = new URL(backend.origin);
    upstreamUrl.pathname = requestedUrl.pathname;
    upstreamUrl.search = requestedUrl.search;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      logger.error(`[api/delivery] upstream GET ${response.status}: ${body}`);

      return NextResponse.json(
        {
          error: body || `Delivery failed with status ${response.status}`,
        },
        {
          status: response.status,
        }
      );
    }

    const headers = new Headers();

    for (const name of [
      "content-type",
      "content-disposition",
      "content-length",
    ]) {
      const value = response.headers.get(name);

      if (value) {
        headers.set(name, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    logger.error(`[api/delivery] GET error: ${message}`);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
