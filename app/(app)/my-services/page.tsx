import type { Metadata } from "next";
import { MyServices } from "@/components/services/my-services";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "My services" };

export default function Page() {
  return <MyServices />;
}
