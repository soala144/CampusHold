import { Skeleton } from "@/components/ui/feedback";
import { PageSkeleton } from "./page-header";

/** Shown while the browser-only app boundary loads. */
export function AppSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-line p-5 lg:flex">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-4 h-9" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
      <div className="flex-1">
        <PageSkeleton />
      </div>
    </div>
  );
}
