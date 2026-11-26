import type { Metadata } from "next";
import { DisputesList } from "@/components/disputes/disputes";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Disputes" };

export default function Page() {
  return <DisputesList />;
}
