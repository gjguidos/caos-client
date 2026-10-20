export { proxy } from "@/shared/auth/middleware";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
