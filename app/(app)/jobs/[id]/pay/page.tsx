import type { Metadata } from "next";
import { Checkout } from "@/components/payments/checkout";
import { seedJobs } from "@/lib/mock/seed";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Fund job" };

export function generateStaticParams() {
  return seedJobs.map((j) => ({ id: j.id }));
}

export default function Page() {
  return <Checkout />;
}
