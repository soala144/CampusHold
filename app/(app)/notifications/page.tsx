import type { Metadata } from "next";
import { NotificationsPage } from "@/components/notifications/notifications-page";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsPage />;
}
