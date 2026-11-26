import type { Metadata } from "next";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <ComingSoon
      title="Accounts are opening soon"
      body="We’re putting the finishing touches on sign-up. You’ll be able to hire, offer your services, or both, from a single account."
    />
  );
}
