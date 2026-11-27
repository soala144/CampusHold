"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import type { AppState } from "@/lib/store/state";
import { AppShell } from "./app-shell";
import { StoreProvider } from "./store-provider";

export function ClientApp({ initial, children }: { initial: AppState; children: ReactNode }) {
  return (
    <ToastProvider>
      <StoreProvider initial={initial}>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    </ToastProvider>
  );
}
