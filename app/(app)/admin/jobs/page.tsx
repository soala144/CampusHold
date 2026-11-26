import type { Metadata } from "next";
import { AdminJobs } from "@/components/admin/admin";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Jobs · Admin" };

export default function Page() {
  return <AdminJobs />;
}
