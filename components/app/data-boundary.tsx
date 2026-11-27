import type { ReactNode } from "react";
import { currentSnapshot } from "@/lib/server/actions";
import { ClientApp } from "./client-app";
import { ClientPublic } from "@/components/public/client-public";

/** Reads the session and the user's data on the server, inside a Suspense boundary. */
export async function AppData({ children }: { children: ReactNode }) {
  const snapshot = await currentSnapshot();
  return <ClientApp initial={snapshot}>{children}</ClientApp>;
}

export async function PublicData({ children }: { children: ReactNode }) {
  const snapshot = await currentSnapshot();
  return <ClientPublic initial={snapshot}>{children}</ClientPublic>;
}
