import type { Metadata } from "next";
import { ServiceDetail } from "@/components/services/service-detail";
import { seedServices } from "@/lib/mock/seed-services";

// Reads the session per request (see app/(public)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Service" };

export function generateStaticParams() {
  return seedServices.map((s) => ({ id: s.id }));
}

export default function Page() {
  return <ServiceDetail />;
}
