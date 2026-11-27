import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Admin" };

export default function Page() {
  return <AdminOverview />;
}
