"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Shuffle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MediaImage } from "@/components/MediaInputs";
import { listCameraRoll } from "@/lib/camera-roll";
import { useApp } from "@/components/providers/AppProvider";
import { readLocal, writeLocal } from "@/lib/local";
import { useCollection, type Row } from "@/lib/useCollection";

const PAGE_SIZE = 6;
type Memory = Row & { image_paths?: string[] };

/** Deduplicates photos by normalized filename and shuffles them randomly. */
function deduplicateAndShuffle(paths: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const p of paths) {
    if (!p) continue;
    // Normalize path to prevent identical photos under different prefixes/queries
    const clean = p.split("?")[0].trim();
    const basename = clean.split("/").pop()?.toLowerCase() || clean;
    if (!seen.has(basename)) {
      seen.add(basename);
      unique.push(p);
    }
  }

  // Fisher-Yates shuffle
  const shuffled = [...unique];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function PhotoWallToggle({
  storageKey,
  relationshipId
}: {
  storageKey: string;
  relationshipId?: string;
}) {
  const [enabled, setEnabled] = useState(() => readLocal<boolean>(storageKey, false) === true);

  useEffect(() => {
    const sync = () => setEnabled(readLocal<boolean>(storageKey, false) === true);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      writeLocal(storageKey, next);
    } catch {
      /* Keep the current tab usable without storage. */
    }
  };

  return (
    <div className="mb-4 flex min-h-11 flex-wrap items-center justify-end gap-2">
      <AnimatePresence mode="wait">
        {enabled && <PhotoWall key="photos" relationshipId={relationshipId} />}
      </AnimatePresence>
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={toggle}
        aria-pressed={enabled}
        aria-label="Photo wall"
        title="Photo wall"
        className="relative z-30 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-lilac/30 bg-midnight/90 text-lilac shadow-soft transition-all duration-300 hover:text-cream focus-visible:ring-2 focus-visible:ring-blush aria-pressed:bg-blush aria-pressed:text-midnight aria-pressed:shadow-glow"
      >
        <Images className="h-5 w-5 transition-transform duration-200" aria-hidden="true" />
      </motion.button>
    </div>
  );
}

function PhotoWall({ relationshipId }: { relationshipId?: string }) {
  const { prefs } = useApp();
  const reduceMotion = useReducedMotion();
  const duration = prefs.animation_enabled && !reduceMotion ? 0.6 : 0;
  const { items, loading } = useCollection<Memory>("memories", {
    order: "created_at",
    ascending: false
  });
  const memories = useMemo(
    () => items.flatMap(({ image_paths }) => (image_paths ?? []).filter(Boolean)),
    [items]
  );
  const [roll, setRoll] = useState<{ id: string; paths: string[]; error: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [shuffledList, setShuffledList] = useState<string[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);

  useEffect(() => {
    if (!relationshipId) return;
    let active = true;
    listCameraRoll(relationshipId)
      .then((paths) => {
        if (active) setRoll({ id: relationshipId, paths, error: false });
      })
      .catch(() => {
        if (active) setRoll({ id: relationshipId, paths: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [relationshipId]);

  const cameraRoll = roll?.id === relationshipId ? roll : null;
  const rawPhotos = useMemo(
    () => [...new Set([...memories, ...(cameraRoll?.paths ?? [])])],
    [cameraRoll, memories]
  );

  // Automatically shuffle and deduplicate whenever photo list updates
  useEffect(() => {
    if (rawPhotos.length > 0) {
      setShuffledList(deduplicateAndShuffle(rawPhotos));
      setPage(0);
    }
  }, [rawPhotos]);

  const handleShuffle = () => {
    setShuffledList((prev) => deduplicateAndShuffle(prev.length ? prev : rawPhotos));
    setPage(0);
    setShuffleCount((c) => c + 1);
  };

  const photos = shuffledList.length ? shuffledList : rawPhotos;
  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = photos.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const count = visible.length;
  const waiting = loading || Boolean(relationshipId && !cameraRoll);

  return (
    <>
      {count > 0 && (
        <motion.div
          aria-hidden="true"
          data-photo-backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-0 z-[-5] grid auto-rows-fr grid-cols-2 gap-[2px] overflow-hidden bg-midnight sm:grid-cols-6"
        >
          {visible.map((path, index) => {
            const fullMobile = count % 2 === 1 && index === count - 1;
            const remainder = count % 3;
            const lastRow = remainder > 0 && index >= count - remainder;
            const desktopSpan =
              lastRow ? (remainder === 1 ? "sm:col-span-6" : "sm:col-span-3") : "sm:col-span-2";
            return (
              <motion.div
                key={`${path}-${currentPage}-${shuffleCount}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`relative min-h-0 overflow-hidden bg-deep ${
                  fullMobile ? "col-span-2" : ""
                } ${desktopSpan}`}
              >
                <MediaImage
                  path={path}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </motion.div>
            );
          })}
          <div className="absolute inset-0 bg-gradient-to-b from-midnight/75 via-midnight/60 to-midnight/85" />
        </motion.div>
      )}
      {!count && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-30 flex flex-wrap items-center gap-2 text-sm text-lilac"
        >
          <span role="status">
            {waiting
              ? "Opening our camera roll…"
              : cameraRoll?.error
              ? "Couldn’t load the camera roll"
              : "No photos yet"}
          </span>
          {!waiting && (
            <Link href="/memories?add=1" className="text-blush underline underline-offset-4">
              Add a photo
            </Link>
          )}
        </motion.div>
      )}

      {pageCount > 1 && (
        <motion.div
          role="group"
          aria-label="Background photos"
          initial={{ opacity: 0, scale: 0.85, x: 15 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.85, x: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="relative z-30 flex items-center gap-1 rounded-full border border-cloud/20 bg-midnight/90 p-1 text-cloud shadow-soft backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => setPage((currentPage + pageCount - 1) % pageCount)}
            aria-label="Previous photos"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-cloud/15 focus-visible:ring-2 focus-visible:ring-blush"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span
            role="status"
            aria-label={`Photo set ${currentPage + 1} of ${pageCount}`}
            className="whitespace-nowrap px-1 text-xs tabular-nums"
          >
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((currentPage + 1) % pageCount)}
            aria-label="Next photos"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-cloud/15 focus-visible:ring-2 focus-visible:ring-blush"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            aria-label="Shuffle photos"
            title="Shuffle photos"
            className="grid h-10 w-10 place-items-center rounded-full text-blush transition-all duration-300 hover:bg-cloud/15 hover:rotate-180 focus-visible:ring-2 focus-visible:ring-blush"
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </>
  );
}
