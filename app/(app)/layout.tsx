import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientApp } from "@/components/app/client-app";
import { AppSkeleton } from "@/components/app/app-skeleton";

/**
 * Stage 2: the signed-in app renders in the browser (mock data lives in
 * localStorage), so the server can't validate instant navigation for it.
 * Remove when Stage 3 moves data to the server.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · CampusHold" },
  robots: { index: false },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <ClientApp>{children}</ClientApp>
    </Suspense>
  );
}
