import type { Metadata } from "next";
import { Wallet } from "@/components/payments/wallet";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Wallet" };

export default function Page() {
  return <Wallet />;
}
