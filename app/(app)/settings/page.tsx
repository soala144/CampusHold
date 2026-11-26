import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsPage />;
}
