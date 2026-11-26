"use client";

import { use, type ReactNode } from "react";
import { browser } from "react-dom";
import { ToastProvider } from "@/components/ui/toast";

/** Browser-only boundary for public pages that read Stage 2 mock data. */
export function ClientPublic({ children }: { children: ReactNode }) {
  use(browser("CampusHold's Stage 2 mock data lives in localStorage."));
  return <ToastProvider>{children}</ToastProvider>;
}
