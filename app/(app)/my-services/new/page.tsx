import type { Metadata } from "next";
import { ServiceEditor } from "@/components/services/service-editor";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "New service" };

export default function Page() {
  return <ServiceEditor />;
}
