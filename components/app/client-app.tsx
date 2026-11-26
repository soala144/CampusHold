"use client";

import { use, type ReactNode } from "react";
import { browser } from "react-dom";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "./app-shell";

/**
 * Browser-only boundary for the signed-in app.
 * Stage 2 keeps all app data in localStorage, which the server can't read,
 * so this subtree renders in the browser. Stage 3 moves data to the server.
 */
export function ClientApp({ children }: { children: ReactNode }) {
  use(browser("CampusHold's Stage 2 mock data lives in localStorage."));
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
