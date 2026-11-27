import type { Metadata } from "next";
import { PayoutsPage } from "@/components/payments/payouts-page";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Payout account" };

export default function Page() {
  return <PayoutsPage />;
}
