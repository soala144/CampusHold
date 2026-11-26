import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page() {
  return <ResetForm />;
}
