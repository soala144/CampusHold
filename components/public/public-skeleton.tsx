import { Skeleton } from "@/components/ui/feedback";

export function PublicSkeleton() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-12 w-full max-w-2xl rounded-full" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-card" />
        ))}
      </div>
    </div>
  );
}
