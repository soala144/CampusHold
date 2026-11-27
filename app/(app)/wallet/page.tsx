import type { Metadata } from "next";
import { Wallet } from "@/components/payments/wallet";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Wallet" };

export default function Page() {
  return <Wallet />;
}
