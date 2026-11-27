import type { Metadata } from "next";
import { DisputesList } from "@/components/disputes/disputes";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Disputes" };

export default function Page() {
  return <DisputesList />;
}
