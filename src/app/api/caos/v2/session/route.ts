import { readSession } from "@/shared/auth/lib/session";
import { v2SessionOwner } from "@/shared/communication-v2/session-owner";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return Response.json(
    { owner: v2SessionOwner(await readSession(req)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
