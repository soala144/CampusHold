import type { Metadata } from "next";
import { Suspense } from "react";
import { NewJobForm } from "@/components/jobs/new-job-form";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Post a job" };

export default function Page() {
  return (
    <Suspense>
      <NewJobForm />
    </Suspense>
  );
}
