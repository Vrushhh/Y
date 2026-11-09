"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Shuffle } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";
import { listCameraRoll } from "@/lib/camera-roll";

const ROTATION_INTERVAL = 5 * 60 * 1000;
const SLIDESHOW_INTERVAL = 6000;

export function PhotoRotation({ relationshipId }: { relationshipId: string }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [direction, setDirection] = useState(1);
  const dragged = useRef(false);
  const reducedMotion = useReducedMotion();
  const closePhoto = useCallback(() => setExpanded(false), []);
  const [slot, setSlot] = useState(() => Math.floor(Date.now() / ROTATION_INTERVAL));

  useEffect(() => {
    let active = true;
    listCameraRoll(relationshipId)
      .then((photos) => { if (active) setPhotos(photos); })
      .catch(() => { if (active) setPhotos([]); });

    return () => { active = false; };
  }, [relationshipId]);

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

  const count = photos.length;
  const featuredIndex = count ? slot % count : 0;
  const index = manualIndex ?? featuredIndex;
  const path = photos[index];

  useEffect(() => {
    if (!slideshow || hovered || expanded || count < 2) return;
    let timer: number;
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        setDirection(1);
        setManualIndex((index + 1) % count);
      }, SLIDESHOW_INTERVAL);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [count, expanded, hovered, index, slideshow]);

  if (!path) return null;

  const move = (step: number) => {
    setDirection(step < 0 ? -1 : 1);
    setManualIndex((index + step + count) % count);
  };

  const photoLabel = `Camera roll photo ${index + 1} of ${count}`;

  return (
    <section className="glass mb-8 rounded-[22px] p-4 sm:p-5" aria-labelledby="photobooth-memories">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="photobooth-memories" className="font-display text-2xl">From our camera roll</h2>
        {count > 1 && <p className="text-sm text-lilac">Featured photo changes every 5 minutes</p>}
      </div>

      <div
        className="relative grid min-h-[20rem] place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_center,#3a2d55,#211a36_70%)] px-4 py-7"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {count > 1 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
            <div className="absolute w-36 -translate-x-24 -rotate-12 rounded-sm bg-cream/80 p-2 pb-5 shadow-soft sm:w-52 sm:-translate-x-40">
              <MediaImage key={photos[(index - 1 + count) % count]} path={photos[(index - 1 + count) % count]} alt="" className="aspect-[4/5] w-full bg-midnight object-cover" />
            </div>
            {count > 2 && <div className="absolute w-36 translate-x-24 rotate-12 rounded-sm bg-cream/80 p-2 pb-5 shadow-soft sm:w-52 sm:translate-x-40">
              <MediaImage key={photos[(index + 1) % count]} path={photos[(index + 1) % count]} alt="" className="aspect-[4/5] w-full bg-midnight object-cover" />
            </div>}
          </div>
        )}
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={path}
            custom={direction}
            variants={{
              enter: (direction: number) => ({ x: reducedMotion ? 0 : direction * 65, rotate: reducedMotion ? 0 : direction * 8, opacity: 0 }),
              center: { x: 0, rotate: 0, opacity: 1 },
              exit: (direction: number) => ({ x: reducedMotion ? 0 : direction * -85, rotate: reducedMotion ? 0 : direction * -9, opacity: 0 })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            dragMomentum={false}
            onPointerDown={() => { dragged.current = false; }}
            onDragStart={() => { dragged.current = true; }}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) >= 40) move(info.offset.x < 0 ? 1 : -1); }}
            className="relative z-10 w-[min(76vw,21rem)] touch-pan-y"
          >
            <button
              type="button"
              aria-label={`Open ${photoLabel.toLowerCase()}`}
              onClick={() => { if (!dragged.current) setExpanded(true); }}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") dragged.current = false; }}
              className="block w-full rounded-sm bg-cream p-2.5 text-midnight shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush"
            >
              <MediaImage path={path} alt={photoLabel} className="aspect-[4/5] w-full bg-[#e5d6d0] object-contain" />
              <span className="block pt-1.5 font-hand text-xl">{index + 1} of {count}</span>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" size="sm" variant="ghost" aria-label="Previous photo" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="soft" onClick={() => move(1 + Math.floor(Math.random() * (count - 1)))}><Shuffle className="h-4 w-4" /> Shuffle</Button>
        <Button type="button" size="sm" variant="soft" onClick={() => {
          if (!slideshow) setManualIndex(index);
          setSlideshow(!slideshow);
        }}>{slideshow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{slideshow ? "Pause slideshow" : "Play slideshow"}</Button>
        <Button type="button" size="sm" variant="ghost" aria-label="Next photo" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
        {manualIndex !== null && <Button type="button" size="sm" variant="ghost" onClick={() => { setSlideshow(false); setManualIndex(null); }}>Back to featured</Button>}
      </div>}

      <Modal open={expanded} onClose={closePhoto} title={photoLabel} wide>
        <MediaImage key={path} path={path} alt={photoLabel} className="h-[min(68dvh,42rem)] w-full rounded-xl object-contain" />
      </Modal>
    </section>
  );
}
