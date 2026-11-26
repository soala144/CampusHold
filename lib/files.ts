import type { Attachment } from "@/lib/domain/types";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;

const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".msi", ".scr", ".js", ".vbs", ".sh", ".apk"];

/**
 * Validate picked files and turn them into attachment records.
 * Stage 2 keeps only metadata; Stage 3 uploads to storage.
 */
export function toAttachments(
  files: FileList | File[] | null,
  existing = 0,
): { attachments: Attachment[]; error: string | null } {
  const list = Array.from(files ?? []);
  if (existing + list.length > MAX_FILES) {
    return { attachments: [], error: `You can attach up to ${MAX_FILES} files.` };
  }
  for (const f of list) {
    const lower = f.name.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return { attachments: [], error: `“${f.name}” can't be attached for security reasons.` };
    }
    if (f.size > MAX_FILE_BYTES) {
      return { attachments: [], error: `“${f.name}” is larger than 25 MB.` };
    }
  }
  return {
    attachments: list.map((f) => ({ id: `file_${crypto.randomUUID().slice(0, 8)}`, name: f.name, sizeBytes: f.size })),
    error: null,
  };
}
