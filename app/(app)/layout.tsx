import type { Metadata } from "next";
import { Suspense } from "react";
import { AppData } from "@/components/app/data-boundary";
import { AppSkeleton } from "@/components/app/app-skeleton";

/**
 * The signed-in app reads the session on every request, so navigations into
 * it block on the server. Revisit with `use cache: private` later.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · CampusHold" },
  robots: { index: false },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <AppData>{children}</AppData>
    </Suspense>
  );
}
