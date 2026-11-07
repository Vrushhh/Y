"use client";

import { useEffect, useState } from "react";
import { MediaImage } from "@/components/MediaInputs";
import { MEDIA_BUCKET } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";

const ROTATION_INTERVAL = 10 * 60 * 1000;

export function PhotoRotation({ relationshipId }: { relationshipId: string }) {
  const folder = `${relationshipId}/photobooth-rotation`;
  const [photos, setPhotos] = useState<string[]>([]);
  const [slot, setSlot] = useState(() => Math.floor(Date.now() / ROTATION_INTERVAL));

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    let active = true;
    client.storage.from(MEDIA_BUCKET)
      .list(folder, { limit: 1000, sortBy: { column: "name", order: "asc" } })
      .then(({ data, error }) => {
        if (!active || error) return;
        setPhotos(data.filter((file) => file.id && /\.(jpe?g|png|webp|gif)$/i.test(file.name))
          .map((file) => `${folder}/${file.name}`));
      });

    return () => { active = false; };
  }, [folder]);

  useEffect(() => {
    let timeout: number;
    const sync = () => {
      window.clearTimeout(timeout);
      const now = Date.now();
      setSlot(Math.floor(now / ROTATION_INTERVAL));
      timeout = window.setTimeout(sync, ROTATION_INTERVAL - now % ROTATION_INTERVAL);
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  if (!photos.length) return null;

  const index = slot % photos.length;
  const path = photos[index];

  return (
    <section className="glass mb-8 rounded-[22px] p-4 sm:p-5" aria-labelledby="photobooth-memories">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="photobooth-memories" className="font-display text-2xl">From our camera roll</h2>
        <p className="text-sm text-lilac">A different photo every 10 minutes</p>
      </div>
      <div className="overflow-hidden rounded-2xl bg-midnight">
        <MediaImage key={path} path={path} alt={`Camera roll photo ${index + 1} of ${photos.length}`} className="h-[min(55dvh,26rem)] w-full object-contain" />
      </div>
    </section>
  );
}
