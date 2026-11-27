"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function AppError({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-24">
      <Alert tone="danger" title="Something went wrong on this page">
        {error.message || "An unexpected error occurred."}
      </Alert>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          <RotateCcw />
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
