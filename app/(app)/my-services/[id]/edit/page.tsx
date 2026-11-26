import type { Metadata } from "next";
import { ServiceEditor } from "@/components/services/service-editor";
import { seedServices } from "@/lib/mock/seed-services";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Edit service" };

export function generateStaticParams() {
  return seedServices.map((s) => ({ id: s.id }));
}

export default function Page() {
  return <ServiceEditor />;
}
