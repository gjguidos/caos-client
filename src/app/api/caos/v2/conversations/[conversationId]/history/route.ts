import { proxyCommunication } from "@/shared/auth/lib/genesis-communication";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  return proxyCommunication(
    req,
    "conversations",
    (await params).conversationId,
    true
  );
}
