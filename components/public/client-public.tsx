"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { StoreProvider } from "@/components/app/store-provider";
import type { AppState } from "@/lib/store/state";

export function ClientPublic({ initial, children }: { initial: AppState; children: ReactNode }) {
  return (
    <ToastProvider>
      <StoreProvider initial={initial} poll={false}>
        {children}
      </StoreProvider>
    </ToastProvider>
  );
}
