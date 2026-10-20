import { clearSessionCookie } from "@/shared/auth/lib/session";
import { getBaseUrl } from "@/shared/auth/lib/utils";
import { logger } from "@/shared/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getBaseUrl(req);
    const res = NextResponse.redirect(`${baseUrl}/`);
    clearSessionCookie(res);
    return res;
  } catch (error) {
    logger.error(
      "Logout error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Still redirect home even if there's an error
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/`);
  }
}
