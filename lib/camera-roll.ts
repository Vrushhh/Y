import { MEDIA_BUCKET } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";

export async function listCameraRoll(relationshipId: string): Promise<string[]> {
  const client = getSupabase();
  if (!client) return [];

  const folder = `${relationshipId}/photobooth-rotation`;
  const { data, error } = await client.storage.from(MEDIA_BUCKET)
    .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;

  return data
    .filter((file) => file.id && /\.(jpe?g|png|webp|gif)$/i.test(file.name))
    .map((file) => `${folder}/${file.name}`);
}
