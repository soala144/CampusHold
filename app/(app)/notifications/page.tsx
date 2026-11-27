import type { Metadata } from "next";
import { NotificationsPage } from "@/components/notifications/notifications-page";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsPage />;
}
