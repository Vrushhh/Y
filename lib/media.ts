"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/config";
import { uid } from "@/lib/local";

export async function compressImage(file: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", quality));
  } catch {
    return file;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read the file"));
    r.readAsDataURL(blob);
  });
}

function extFor(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "jpg";
}

/**
 * Stores a file and returns its reference. Supabase mode: a private storage path (read back through signed URLs).
 * Preview mode: an inline data URL kept in this browser only.
 */
export async function uploadMedia(
  blob: Blob,
  opts: { mode: "supabase" | "preview"; relationshipId?: string | null; folder?: string }
): Promise<string> {
  const isImage = blob.type.startsWith("image/");
  if (opts.mode === "preview") {
    const small = isImage ? await compressImage(blob, 900, 0.75) : blob;
    if (small.size > 1_500_000) throw new Error("Preview mode can only keep small files. Connect Supabase to upload this one.");
    return blobToDataUrl(small);
  }
  const sb = getSupabase();
  if (!sb || !opts.relationshipId) throw new Error("You need to be signed in to upload.");
  const body = isImage ? await compressImage(blob) : blob;
  const path = [opts.relationshipId, opts.folder, `${uid()}.${extFor(body.type)}`].filter(Boolean).join("/");
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, body, { contentType: body.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

const cache = new Map<string, { url: string; expires: number }>();

export async function resolveMediaUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^(data:|https?:|blob:)/.test(path)) return path;
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function useMediaUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(() => (path && /^(data:|https?:|blob:)/.test(path) ? path : null));
  useEffect(() => {
    let alive = true;
    resolveMediaUrl(path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [path]);
  return url;
}
