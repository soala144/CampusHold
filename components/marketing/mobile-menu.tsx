"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ButtonLink } from "@/components/ui/button";
import { navLinks } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-surface"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open &&
        createPortal(
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-[4.5rem] bottom-0 z-30 overflow-y-auto border-t border-line bg-canvas"
        >
          <nav aria-label="Mobile" className="container-page flex flex-col py-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 text-lg tracking-tight text-ink"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-8 grid gap-3">
              <ButtonLink href="/signup" size="lg" onClick={() => setOpen(false)}>
                Get started
              </ButtonLink>
              <ButtonLink
                href="/login"
                variant="secondary"
                size="lg"
                onClick={() => setOpen(false)}
              >
                Log in
              </ButtonLink>
            </div>
          </nav>
        </div>,
          document.body,
        )}
    </div>
  );
}
