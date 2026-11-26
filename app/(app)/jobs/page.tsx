import type { Metadata } from "next";
import { JobsList } from "@/components/jobs/jobs-list";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Jobs" };

export default function Page() {
  return <JobsList />;
}
