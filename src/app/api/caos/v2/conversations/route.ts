import { proxyCommunication } from "@/shared/auth/lib/genesis-communication";
export const runtime = "nodejs";
export async function POST(req: Request) {
  return proxyCommunication(req, "conversations");
}
