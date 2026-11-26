import type { Metadata } from "next";
import { DisputeDetail } from "@/components/disputes/disputes";
import { seedDisputes } from "@/lib/mock/seed";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Dispute" };

export function generateStaticParams() {
  return seedDisputes.map((d) => ({ id: d.id }));
}

export default function Page() {
  return <DisputeDetail />;
}
