import "server-only";
import type { Attachment } from "@/lib/domain/types";

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** True when `url` is a file this user uploaded through us. */
export function isOwnUpload(url: string, userId: string) {
  const cfg = cloudinaryConfig();
  if (!cfg || url.length > 500) return false;
  const prefix = `https://res.cloudinary.com/${cfg.cloudName}/`;
  return url.startsWith(prefix) && url.includes(`/campushold/${userId}/`) && !/\s/.test(url);
}

/**
 * Clean attachments sent by the browser: keep the known fields, and keep a
 * link only when it points at this user's own upload folder.
 */
export function cleanAttachments(value: unknown, userId: string, max = 10): Attachment[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const out: Attachment[] = [];
  for (const raw of value) {
    const a = raw as Record<string, unknown>;
    if (!a || typeof a.id !== "string" || typeof a.name !== "string" || typeof a.sizeBytes !== "number") return null;
    const file: Attachment = { id: a.id.slice(0, 40), name: a.name.slice(0, 200), sizeBytes: Math.max(0, Math.floor(a.sizeBytes)) };
    if (typeof a.url === "string" && isOwnUpload(a.url, userId)) file.url = a.url;
    out.push(file);
  }
  return out;
}
