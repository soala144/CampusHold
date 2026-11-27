import type { Metadata } from "next";
import { AdminDisputes } from "@/components/admin/admin";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Disputes · Admin" };

export default function Page() {
  return <AdminDisputes />;
}
