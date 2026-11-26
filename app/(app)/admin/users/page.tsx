import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Users · Admin" };

export default function Page() {
  return <AdminUsers />;
}
