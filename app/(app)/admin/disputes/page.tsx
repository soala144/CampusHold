import type { Metadata } from "next";
import { AdminDisputes } from "@/components/admin/admin";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Disputes · Admin" };

export default function Page() {
  return <AdminDisputes />;
}
