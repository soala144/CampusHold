import type { Metadata } from "next";
import { AdminTransactions } from "@/components/admin/admin";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Transactions · Admin" };

export default function Page() {
  return <AdminTransactions />;
}
