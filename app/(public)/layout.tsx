import { Suspense } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { PublicData } from "@/components/app/data-boundary";
import { PublicSkeleton } from "@/components/public/public-skeleton";

/** Public browsing (no account needed). Data is read per request on the server. */
export const instant = false;

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<PublicSkeleton />}>
          <PublicData>{children}</PublicData>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
