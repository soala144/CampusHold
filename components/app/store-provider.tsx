"use client";

import { useEffect, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { InitialStateContext, hydrate, onSyncError, refresh } from "@/lib/store/store";
import type { AppState } from "@/lib/store/state";

const POLL_MS = 8000;

/** Seeds the client store from the server snapshot and keeps it fresh. */
export function StoreProvider({ initial, poll = true, children }: { initial: AppState; poll?: boolean; children: ReactNode }) {
  hydrate(initial);
  const toast = useToast();

  useEffect(() => onSyncError((m) => toast.error(m)), [toast]);

  useEffect(() => {
    if (!poll || !initial.signedIn) return;
    const id = setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [poll, initial.signedIn]);

  return <InitialStateContext value={initial}>{children}</InitialStateContext>;
}
