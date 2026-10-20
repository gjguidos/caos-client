import { readSession } from "@/shared/auth/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * API endpoint to expose session data to client-side code
 * Allows React components to know user roles for conditional rendering
 */
export async function GET(req: NextRequest) {
  try {
    const session = await readSession(req);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        roles: [],
      });
    }

    // Return safe session data (no sensitive tokens) including roles
    return NextResponse.json({
      authenticated: true,
      user: {
        name: session.name,
        username: session.preferred_username,
        preferred_username: session.preferred_username,
        sub: session.sub,
        id: session.sub,
      },
      roles: session.roles || [],
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      roles: [],
    });
  }
}
