import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <Dashboard />;
}
