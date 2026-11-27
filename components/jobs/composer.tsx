"use client";

import { Paperclip, SendHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/domain/types";
import { ops, run } from "@/lib/store";
import { AttachmentChip, useAttachmentUpload } from "./attachments";

export function Composer({ jobId, authorId, onSent }: { jobId: string; authorId: string; onSent?: () => void }) {
  const id = useId();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const upload = useAttachmentUpload();

  function send() {
    const r = run(ops.sendMessage(jobId, authorId, body, files));
    if (!r.ok) return setError(r.error);
    setBody("");
    setFiles([]);
    setError(null);
    onSent?.();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-col gap-2 border-t border-line bg-canvas p-3 sm:p-4"
    >
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f) => (
            <AttachmentChip key={f.id} file={f} onRemove={() => setFiles(files.filter((x) => x.id !== f.id))} />
          ))}
        </div>
      )}
      {upload.uploading && <p className="text-sm text-muted" role="status">{upload.uploading}</p>}
      {(error ?? upload.error) && <p className="text-sm text-danger" role="alert">{error ?? upload.error}</p>}
      <div className="flex items-end gap-2">
        <label
          htmlFor={id}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink"
          title="Attach files"
        >
          <Paperclip className="size-4" aria-hidden />
          <span className="sr-only">Attach files</span>
          <input
            id={id}
            type="file"
            multiple
            className="sr-only"
            disabled={upload.uploading !== null}
            onChange={(e) => {
              const picked = upload.add(e.target.files, files.length);
              e.target.value = "";
              void picked.then((added) => added.length > 0 && setFiles((prev) => [...prev, ...added]));
            }}
          />
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          aria-label="Message"
          placeholder="Write a message…"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl border border-line-strong bg-canvas px-4 py-2.5 text-[0.9375rem] outline-none placeholder:text-subtle focus:border-ink [field-sizing:content]"
        />
        <Button type="submit" aria-label="Send message" size="icon" disabled={upload.uploading !== null || (!body.trim() && files.length === 0)}>
          <SendHorizontal />
        </Button>
      </div>
      <p className="hidden text-xs text-subtle sm:block">Enter to send · Shift + Enter for a new line</p>
    </form>
  );
}
