import VAOSLogo from "@/shared/components/VAOSLogo";
import { sidebarSurfaceClass } from "@/shared/components/layout/AppShell/SidebarRow";
import Link from "next/link";

export function SidebarHeader() {
  return (
    <div>
      <div className="px-100 py-100">
        <Link href="/" className={sidebarSurfaceClass("gap-100")}>
          <VAOSLogo
            freeZone="default"
            width={200}
            height={100}
            linkToHome={false}
          />
        </Link>
      </div>
      <div className="mx-100 border-b border-elevation-1-border" />
    </div>
  );
}
