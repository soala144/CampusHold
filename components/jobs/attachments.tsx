"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useId, useState } from "react";
import type { Attachment } from "@/lib/domain/types";
import { formatBytes } from "@/lib/format";
import { toAttachments } from "@/lib/files";
import { cn } from "@/lib/cn";

export function AttachmentChip({
  file,
  onRemove,
  className,
}: {
  file: Attachment;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-canvas py-1.5 pr-2 pl-2.5 text-xs",
        className,
      )}
    >
      <FileText className="size-3.5 shrink-0 text-muted" aria-hidden />
      <span className="truncate font-medium text-ink">{file.name}</span>
      <span className="shrink-0 text-subtle">{formatBytes(file.sizeBytes)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="rounded p-0.5 text-muted hover:bg-surface hover:text-ink">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/** File picker that produces attachment metadata and shows the picked list. */
export function AttachmentPicker({
  value,
  onChange,
  label = "Attach files",
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  label?: string;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 self-start rounded-full border border-dashed border-line-strong px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink"
      >
        <Paperclip className="size-4" aria-hidden />
        {label}
        <input
          id={id}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            const { attachments, error } = toAttachments(e.target.files, value.length);
            setError(error);
            if (!error) onChange([...value, ...attachments]);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((f) => (
            <AttachmentChip key={f.id} file={f} onRemove={() => onChange(value.filter((x) => x.id !== f.id))} />
          ))}
        </div>
      )}
      <p className="text-xs text-subtle">Up to 10 files, 25 MB each. File contents aren&rsquo;t stored in this demo.</p>
    </div>
  );
}
