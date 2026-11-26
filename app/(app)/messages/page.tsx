import type { Metadata } from "next";
import { MessagesList } from "@/components/jobs/messages-list";

// Stage 2: browser-only page (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <MessagesList />;
}
