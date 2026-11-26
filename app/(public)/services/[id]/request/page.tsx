import type { Metadata } from "next";
import { Suspense } from "react";
import { ServiceRequest } from "@/components/services/service-request";
import { seedServices } from "@/lib/mock/seed-services";

// Stage 2: browser-only page (see app/(public)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Request a service" };

export function generateStaticParams() {
  return seedServices.map((s) => ({ id: s.id }));
}

export default function Page() {
  return (
    <Suspense>
      <ServiceRequest />
    </Suspense>
  );
}
