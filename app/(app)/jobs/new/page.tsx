import type { Metadata } from "next";
import { Suspense } from "react";
import { NewJobForm } from "@/components/jobs/new-job-form";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Post a job" };

export default function Page() {
  return (
    <Suspense>
      <NewJobForm />
    </Suspense>
  );
}
