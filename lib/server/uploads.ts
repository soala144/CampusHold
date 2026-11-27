"use server";

import { createHash } from "node:crypto";
import { getSessionUser } from "./session";
import { cloudinaryConfig } from "./cloudinary";

export type UploadKind = "files" | "covers";
export type UploadTicket = { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };

/**
 * Sign one direct browser upload to Cloudinary. The secret never leaves the
 * server, and each user can only write inside their own folder.
 */
export async function signUpload(kind: UploadKind): Promise<UploadTicket | null> {
  const user = await getSessionUser();
  const cfg = cloudinaryConfig();
  if (!user || !cfg || (kind !== "files" && kind !== "covers")) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `campushold/${user.id}/${kind}`;
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`).digest("hex");
  return { cloudName: cfg.cloudName, apiKey: cfg.apiKey, timestamp, folder, signature };
}
