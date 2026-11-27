"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useId, useState } from "react";
import type { Attachment } from "@/lib/domain/types";
import { formatBytes } from "@/lib/format";
import { toAttachments } from "@/lib/files";
import { uploadAttachments } from "@/lib/upload";
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
      {file.url ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-ink underline-offset-2 hover:underline">
          {file.name}
        </a>
      ) : (
        <span className="truncate font-medium text-ink">{file.name}</span>
      )}
      <span className="shrink-0 text-subtle">{formatBytes(file.sizeBytes)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="rounded p-0.5 text-muted hover:bg-surface hover:text-ink">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/** Check picked files, upload them to storage and return attachment records. */
export function useAttachmentUpload() {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function add(list: FileList | null, existing: number): Promise<Attachment[]> {
    const files = Array.from(list ?? []);
    const checked = toAttachments(files, existing);
    setError(checked.error);
    if (checked.error || files.length === 0) return [];
    setUploading(`Uploading 0 of ${files.length}…`);
    try {
      return await uploadAttachments(files, (done, total) => setUploading(`Uploading ${done} of ${total}…`));
    } catch (e) {
      setError(e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed. Please try again.");
      return [];
    } finally {
      setUploading(null);
    }
  }
  return { add, uploading, error, setError };
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
  const { add, uploading, error } = useAttachmentUpload();
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
          disabled={uploading !== null}
          onChange={(e) => {
            const picked = add(e.target.files, value.length);
            e.target.value = "";
            void picked.then((added) => added.length > 0 && onChange([...value, ...added]));
          }}
        />
      </label>
      {uploading && <p className="text-sm text-muted" role="status">{uploading}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((f) => (
            <AttachmentChip key={f.id} file={f} onRemove={() => onChange(value.filter((x) => x.id !== f.id))} />
          ))}
        </div>
      )}
      <p className="text-xs text-subtle">Up to 10 files, 25 MB each.</p>
    </div>
  );
}
