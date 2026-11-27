"use client";

import { ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import type { ServiceCover } from "@/lib/domain/types";

/**
 * Cover photo by link. The browser loads the image once to check it works
 * and to measure its shape for the masonry grid.
 */
export function CoverUrlField({
  value,
  onChange,
}: {
  value?: ServiceCover;
  onChange: (cover: ServiceCover | undefined) => void;
}) {
  const [url, setUrl] = useState(value?.url ?? "");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");

  function check() {
    const trimmed = url.trim();
    if (!trimmed) return onChange(undefined);
    if (!/^https:\/\/[^\s]+$/i.test(trimmed) || trimmed.length > 500) {
      setStatus("error");
      return;
    }
    setStatus("checking");
    const img = new Image();
    img.onload = () => {
      setStatus("idle");
      const aspect = Math.min(2, Math.max(0.5, +(img.naturalWidth / img.naturalHeight).toFixed(3)));
      onChange({ url: trimmed, alt: value?.alt ?? "Service cover image", aspect });
    };
    img.onerror = () => setStatus("error");
    img.src = trimmed;
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="cover-url" className="text-sm font-medium">
        Cover image <span className="font-normal text-subtle">· optional</span>
      </label>
      <div className="flex gap-2">
        <Input
          id="cover-url"
          type="url"
          inputMode="url"
          placeholder="https://… link to a photo of your work"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setStatus("idle");
          }}
          onBlur={check}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              check();
            }
          }}
          aria-invalid={status === "error"}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove cover image"
            onClick={() => {
              setUrl("");
              onChange(undefined);
            }}
          >
            <X />
          </Button>
        )}
      </div>
      {status === "error" ? (
        <p className="text-sm text-danger">That link didn&rsquo;t load as an image. Use a direct https link to a JPG, PNG or WebP.</p>
      ) : status === "checking" ? (
        <p className="text-sm text-muted">Checking image…</p>
      ) : value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary user link */}
          <img src={value.url} alt="" className="h-16 w-24 rounded-lg border border-line object-cover" />
          <Input
            aria-label="Describe the image"
            placeholder="Describe the image (for screen readers)"
            value={value.alt}
            maxLength={120}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <ImageIcon className="size-3.5" aria-hidden />
          Paste a link to a photo of your work. Without one, a plain category cover is shown.
        </p>
      )}
    </div>
  );
}
