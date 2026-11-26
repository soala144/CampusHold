import { Suspense } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ClientPublic } from "@/components/public/client-public";
import { PublicSkeleton } from "@/components/public/public-skeleton";

/**
 * Public browsing (no account needed). Stage 2 reads mock data from
 * localStorage, so these pages render in the browser — see app/(app)/layout.tsx.
 */
export const instant = false;

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<PublicSkeleton />}>
          <ClientPublic>{children}</ClientPublic>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
