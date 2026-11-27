import type { Attachment } from "@/lib/domain/types";
import { signUpload, type UploadKind } from "@/lib/server/uploads";

export type Uploaded = { url: string; bytes: number; width?: number; height?: number };

/**
 * Upload one file straight from the browser to Cloudinary with a signature
 * from our server. Returns null when uploads aren't configured.
 */
export async function uploadFile(file: File, kind: UploadKind, onProgress?: (pct: number) => void): Promise<Uploaded | null> {
  const ticket = await signUpload(kind);
  if (!ticket) return null;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", ticket.apiKey);
  form.append("timestamp", String(ticket.timestamp));
  form.append("folder", ticket.folder);
  form.append("signature", ticket.signature);
  const body = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${ticket.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json?.error?.message ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(form);
  });
  return {
    url: String(body.secure_url),
    bytes: Number(body.bytes) || file.size,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
  };
}

/** Upload picked files and return attachment records. Falls back to name-only records without Cloudinary. */
export async function uploadAttachments(files: File[], onProgress?: (done: number, total: number) => void): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const [i, f] of files.entries()) {
    const up = await uploadFile(f, "files");
    out.push({ id: `file_${crypto.randomUUID().slice(0, 8)}`, name: f.name, sizeBytes: up?.bytes ?? f.size, ...(up ? { url: up.url } : {}) });
    onProgress?.(i + 1, files.length);
  }
  return out;
}
