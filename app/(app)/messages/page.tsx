import type { Metadata } from "next";
import { MessagesList } from "@/components/jobs/messages-list";

// Reads the session per request (see app/(app)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <MessagesList />;
}
