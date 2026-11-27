"use client";

import { ImageIcon, Upload, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Spinner } from "@/components/ui/feedback";
import type { ServiceCover } from "@/lib/domain/types";
import { uploadFile } from "@/lib/upload";

const MAX_COVER_BYTES = 10 * 1024 * 1024;

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
  const [upload, setUpload] = useState<{ pct: number } | { error: string } | null>(null);
  const fileId = useId();

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return setUpload({ error: "Choose a JPG, PNG or WebP photo." });
    if (file.size > MAX_COVER_BYTES) return setUpload({ error: "That photo is larger than 10 MB." });
    setUpload({ pct: 0 });
    try {
      const up = await uploadFile(file, "covers", (pct) => setUpload({ pct }));
      if (!up) return setUpload({ error: "Photo uploads aren’t set up yet. Paste a link instead." });
      const aspect = up.width && up.height ? Math.min(2, Math.max(0.5, +(up.width / up.height).toFixed(3))) : 0.75;
      setUrl(up.url);
      setStatus("idle");
      setUpload(null);
      onChange({ url: up.url, alt: value?.alt ?? "Service cover image", aspect });
    } catch (e) {
      setUpload({ error: e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed." });
    }
  }

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
          placeholder="Paste an https:// image link"
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
        <label
          htmlFor={fileId}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium hover:border-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink"
        >
          {upload && "pct" in upload ? <Spinner /> : <Upload className="size-4" aria-hidden />}
          <span className="hidden sm:inline">{upload && "pct" in upload ? `${upload.pct}%` : "Upload"}</span>
          <span className="sr-only sm:hidden">Upload a photo</span>
          <input
            id={fileId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={upload !== null && "pct" in upload}
            onChange={(e) => {
              void uploadCover(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
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
      {upload && "error" in upload && <p className="text-sm text-danger">{upload.error}</p>}
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
          Upload a photo of your work or paste a link. Without one, a plain category cover is shown.
        </p>
      )}
    </div>
  );
}
