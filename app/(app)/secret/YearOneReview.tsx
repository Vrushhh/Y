"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Clapperboard, Heart, Rocket, Sparkles, Trophy } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";

const SLIDES = [
  { label: "The premiere", title: "Our Little Universe", line: "Year One · The official review", body: "Starring Yukku and Sonu. A year of becoming each other’s favourite person to tell things to.", icon: Clapperboard },
  { label: "By the numbers", title: "One trip around the sun", line: "12 months · 2 co-stars · 1 shared universe", body: "Number of times I’d choose you again? The calculator gave up.", icon: Sparkles },
  { label: "The camera roll", title: "Somewhere in the good part", line: "Best supporting character · The camera roll", body: "The best bit of a photo is everything it brings back around the edges.", icon: Camera },
  { label: "The awards", title: "And the award goes to…", line: "Yukku · Best person to do absolutely nothing with", body: "The jury was unanimous. It was also just me.", icon: Trophy },
  { label: "The critic’s verdict", title: "Five stars. Would fall again.", line: "★★★★★", body: "The big days got the photos. The little days made me fall for you again.", icon: Heart },
  { label: "The post-credits scene", title: "See you in Year Two", line: "Sequel confirmed · Same co-stars", body: "More photos, more firsts, and more ordinary days with you. Happy anniversary, Yukku.", icon: Rocket },
];

export default function YearOneReview({ onClose, photo }: { onClose: () => void; photo?: { path: string; title: string } }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const last = index === SLIDES.length - 1;

  return (
    <Modal open title="Year One Relationship Review" onClose={onClose} wide>
      <div onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const step = event.key === "ArrowRight" ? 1 : -1;
          setIndex((current) => Math.max(0, Math.min(SLIDES.length - 1, current + step)));
        }
      }}>
        <div className="mb-3 flex gap-1.5" aria-hidden="true">
          {SLIDES.map((item, i) => <span key={item.label} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-blush" : "bg-lilac/20"}`} />)}
        </div>
        <div aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={slide.label}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="flex min-h-[19rem] flex-col items-center justify-center gap-3 rounded-[24px] border border-blush/25 bg-gradient-to-br from-[#513350] via-[#322543] to-[#211831] px-5 py-8 text-center sm:px-10"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-blush">{index + 1} / {SLIDES.length} · {slide.label}</p>
              <Icon className="h-9 w-9 text-cream" aria-hidden="true" />
              <h3 className="font-display text-4xl text-cream sm:text-5xl">{slide.title}</h3>
              <p className="text-sm font-semibold text-blush">{slide.line}</p>
              {slide.icon === Camera && photo && <MediaImage path={photo.path} alt={photo.title} className="max-h-40 max-w-full rounded-xl object-contain" />}
              <p className="max-w-md text-sm leading-relaxed text-cloud">{slide.body}</p>
            </motion.article>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="soft" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
          {last
            ? <Button size="sm" onClick={() => setIndex(0)}>Watch again</Button>
            : <Button size="sm" onClick={() => setIndex(index + 1)}>Next slide <ArrowRight className="h-4 w-4" /></Button>}
        </div>
      </div>
    </Modal>
  );
}
