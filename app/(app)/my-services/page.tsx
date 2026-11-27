import type { Metadata } from "next";
import { MyServices } from "@/components/services/my-services";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "My services" };

export default function Page() {
  return <MyServices />;
}
