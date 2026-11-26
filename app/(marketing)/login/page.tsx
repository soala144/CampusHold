import type { Metadata } from "next";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <ComingSoon
      title="Log in is coming soon"
      body="Accounts aren’t open yet. Check back shortly to sign in to your CampusHold workspace."
    />
  );
}
