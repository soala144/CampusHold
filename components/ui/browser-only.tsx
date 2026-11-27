"use client";

import { use, type ReactNode } from "react";
import { browser } from "react-dom";

/** Renders children only in the browser (e.g. UI that reads localStorage on first render). */
export function BrowserOnly({ reason, children }: { reason: string; children: ReactNode }) {
  use(browser(reason));
  return <>{children}</>;
}
