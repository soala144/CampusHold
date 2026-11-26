import type { Metadata } from "next";
import { VerifyFlow } from "@/components/auth/verify-flow";

export const metadata: Metadata = { title: "Verify your account" };

export default function Page() {
  return <VerifyFlow />;
}
