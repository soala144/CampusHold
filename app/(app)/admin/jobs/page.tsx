import type { Metadata } from "next";
import { AdminJobs } from "@/components/admin/admin";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Jobs · Admin" };

export default function Page() {
  return <AdminJobs />;
}
