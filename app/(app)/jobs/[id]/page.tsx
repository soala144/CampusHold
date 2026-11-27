import type { Metadata } from "next";
import { JobWorkspace } from "@/components/jobs/job-workspace";
import { seedJobs } from "@/lib/mock/seed";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Job workspace" };

export function generateStaticParams() {
  return seedJobs.map((j) => ({ id: j.id }));
}

export default function Page() {
  return <JobWorkspace />;
}
