import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsPage />;
}
