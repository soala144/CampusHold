import type { Metadata } from "next";
import { FreelancerProfile } from "@/components/marketplace/freelancer-profile";
import { seedUsers } from "@/lib/mock/seed";

// Reads the session per request (see app/(public)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Freelancer profile" };

export function generateStaticParams() {
  return seedUsers.filter((u) => u.freelancer).map((u) => ({ username: u.username }));
}

export default function Page() {
  return <FreelancerProfile />;
}
