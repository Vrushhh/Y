"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { MediaImage } from "@/components/MediaInputs";
import { listCameraRoll } from "@/lib/camera-roll";

const PAGE_SIZE = 6;
type Photo = { path: string; alt: string };

export function PhotoWall({ relationshipId, memories, loading }: {
  relationshipId?: string;
  memories: Photo[];
  loading: boolean;
}) {
  const [roll, setRoll] = useState<{ id: string; paths: string[]; error: boolean } | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!relationshipId) return;
    let active = true;
    listCameraRoll(relationshipId)
      .then((paths) => { if (active) setRoll({ id: relationshipId, paths, error: false }); })
      .catch(() => { if (active) setRoll({ id: relationshipId, paths: [], error: true }); });
    return () => { active = false; };
  }, [relationshipId]);

  const cameraRoll = roll?.id === relationshipId ? roll : null;
  const photos = useMemo(() => {
    const collection = new Map(memories.map((photo) => [photo.path, photo]));
    for (const [index, path] of (cameraRoll?.paths ?? []).entries()) {
      if (!collection.has(path)) collection.set(path, { path, alt: `Camera roll photo ${index + 1}` });
    }
    return [...collection.values()];
  }, [cameraRoll, memories]);

  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = photos.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const count = visible.length;
  const waiting = loading || Boolean(relationshipId && !cameraRoll);

  return (
    <section aria-label="Photo wall" className="fixed inset-0 z-[35] overflow-hidden bg-midnight">
      {count ? (
        <div className="grid h-full auto-rows-fr grid-cols-2 gap-[2px] sm:grid-cols-6">
          {visible.map(({ path, alt }, index) => {
            const fullMobile = count % 2 === 1 && index === count - 1;
            const remainder = count % 3;
            const lastRow = remainder > 0 && index >= count - remainder;
            const desktopSpan = lastRow ? (remainder === 1 ? "sm:col-span-6" : "sm:col-span-3") : "sm:col-span-2";
            return (
              <div key={path} className={`relative min-h-0 overflow-hidden bg-deep ${fullMobile ? "col-span-2" : ""} ${desktopSpan}`}>
                <MediaImage path={path} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid h-full place-items-center px-6 text-center">
          <div className="space-y-3">
            <Images className="mx-auto h-8 w-8 text-blush" aria-hidden="true" />
            <p className="font-display text-3xl" role="status">
              {waiting ? "Opening our camera roll…" : cameraRoll?.error ? "Couldn’t load the camera roll" : "Our photo wall starts here"}
            </p>
            {!waiting && <Link href="/memories?add=1" className="inline-block rounded-full bg-cloud/10 px-4 py-2 text-sm text-blush hover:bg-cloud/15">Add a photo to a memory</Link>}
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <div className="utility-dock-bottom absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-cloud/20 bg-midnight/85 p-1 text-cloud shadow-soft">
          <button type="button" onClick={() => setPage((currentPage + pageCount - 1) % pageCount)} aria-label="Previous photos" className="grid h-10 w-10 place-items-center rounded-full hover:bg-cloud/15 focus-visible:ring-2 focus-visible:ring-blush">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span role="status" aria-label={`Photo set ${currentPage + 1} of ${pageCount}`} className="whitespace-nowrap px-1 text-xs tabular-nums">{currentPage + 1} / {pageCount}</span>
          <button type="button" onClick={() => setPage((currentPage + 1) % pageCount)} aria-label="Next photos" className="grid h-10 w-10 place-items-center rounded-full hover:bg-cloud/15 focus-visible:ring-2 focus-visible:ring-blush">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
