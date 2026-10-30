import { proxyCreationReview } from "@/shared/auth/lib/agent-creation-review";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  return proxyCreationReview(req, (await params).agentId, "create");
}
