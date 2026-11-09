"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Clapperboard,
  Film,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Rocket,
  SkipForward,
  Sparkles,
  Trophy,
  X
} from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";
import { useApp } from "@/components/providers/AppProvider";
import { useSoundtrackPlayer } from "@/components/BackgroundMusic";
import { resolveMediaUrl } from "@/lib/media";

const SLIDES = [
  { label: "The premiere", title: "Our Little Universe", line: "Year One · The official review", body: "Starring Yukku and Sonu. A year of becoming each other’s favourite person to tell things to.", icon: Clapperboard },
  { label: "By the numbers", title: "One trip around the sun", line: "12 months · 2 co-stars · 1 shared universe", body: "Number of times I’d choose you again? The calculator gave up.", icon: Sparkles },
  { label: "The camera roll", title: "Somewhere in the good part", line: "Best supporting character · The camera roll", body: "The best bit of a photo is everything it brings back around the edges.", icon: Camera },
  { label: "The awards", title: "And the award goes to…", line: "Yukku · Best person to do absolutely nothing with", body: "The jury was unanimous. It was also just me.", icon: Trophy },
  { label: "The critic’s verdict", title: "Five stars. Would fall again.", line: "★★★★★", body: "The big days got the photos. The little days made me fall for you again.", icon: Heart },
  { label: "The post-credits scene", title: "See you in Year Two", line: "Sequel confirmed · Same co-stars", body: "More photos, more firsts, and more ordinary days with you. Happy anniversary, Yukku.", icon: Rocket },
];

export const POST_CREDITS_CLIPS = [
  "0bb956f9-ce3d-4abb-807c-c31ec441504a.MP4",
  "282e82da-09e6-43a0-b273-3c180d82d352.MP4",
  "5623fe1c-f057-4c81-9b2d-78172ca8c8fb.MP4",
  "6e01db72-348a-461a-8744-3f4d214d84bb.MP4",
  "a602b66d-1d9a-4603-9510-88ee1638c0b7.MP4",
  "ae66fbb8-8323-4fdd-b11e-86f8ea9e8be7.MP4",
];

// Helper to generate a lightweight placeholder video for preview mode / tests
function generatePreviewVideo(index: number): Promise<string> {
  if (typeof window === "undefined" || !window.document) return Promise.resolve("");
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve("");

  ctx.fillStyle = "#221535";
  ctx.fillRect(0, 0, 360, 640);
  ctx.fillStyle = "#E8B9D0";
  ctx.font = "bold 26px serif";
  ctx.textAlign = "center";
  ctx.fillText("Post-Credits Scene", 180, 290);
  ctx.fillStyle = "#F8E8D8";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Clip ${index + 1} of 6`, 180, 330);
  ctx.fillStyle = "#C9BCE8";
  ctx.font = "italic 16px sans-serif";
  ctx.fillText("Why I love her a lot 💕", 180, 365);

  try {
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];
    return new Promise((resolve) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(URL.createObjectURL(blob));
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 800);
    });
  } catch {
    return Promise.resolve("");
  }
}

export default function YearOneReview({ onClose, photo }: { onClose: () => void; photo?: { path: string; title: string } }) {
  const { relationship, mode } = useApp();
  const soundtrack = useSoundtrackPlayer();
  const reduceMotion = useReducedMotion();

  // Navigation indices: 0..5 are the original slides. 6 is the hidden post-credits reveal card!
  const [index, setIndex] = useState(0);

  // Compilation playback state
  const [isPlayingCompilation, setIsPlayingCompilation] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [loadingClip, setLoadingClip] = useState(false);
  const [clipError, setClipError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [compilationFinished, setCompilationFinished] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cachedUrls = useRef<Map<number, string>>(new Map());

  // Slide variables
  const isPostCreditsCard = index === SLIDES.length;
  const slide = isPostCreditsCard ? null : SLIDES[index];
  const Icon = slide?.icon ?? Rocket;

  // Pause site soundtrack during compilation playback
  const pauseSiteSoundtrack = useCallback(() => {
    try {
      if (soundtrack?.playing) {
        soundtrack.toggle();
      }
      if (typeof document !== "undefined") {
        document.querySelectorAll("audio").forEach((a) => {
          try {
            a.pause();
          } catch {}
        });
      }
    } catch (e) {
      console.warn("Could not pause background audio:", e);
    }
  }, [soundtrack]);

  // Request short-lived signed URL for a specific clip
  const loadClip = useCallback(
    async (clipIdx: number) => {
      if (clipIdx < 0 || clipIdx >= POST_CREDITS_CLIPS.length) return;
      setLoadingClip(true);
      setClipError(false);

      // Check in-memory cache for this session
      const cached = cachedUrls.current.get(clipIdx);
      if (cached) {
        setClipUrl(cached);
        setLoadingClip(false);
        return;
      }

      const filename = POST_CREDITS_CLIPS[clipIdx];
      const relId = relationship?.id ?? "preview";
      const folderPath = `${relId}/year-one-post-credits/${filename}`;

      try {
        let url: string | null = null;
        if (mode === "supabase") {
          // Request short-lived URL (300 seconds = 5 minutes) via signed-media helper
          url = await resolveMediaUrl(folderPath, 300);
        }

        // If preview mode or no signed URL returned, use fallback video
        if (!url) {
          url = await generatePreviewVideo(clipIdx);
        }

        if (url) {
          cachedUrls.current.set(clipIdx, url);
          setClipUrl(url);
          // Pre-fetch the next clip URL in background
          if (clipIdx + 1 < POST_CREDITS_CLIPS.length && !cachedUrls.current.has(clipIdx + 1)) {
            const nextFilename = POST_CREDITS_CLIPS[clipIdx + 1];
            const nextPath = `${relId}/year-one-post-credits/${nextFilename}`;
            if (mode === "supabase") {
              resolveMediaUrl(nextPath, 300).then((u) => {
                if (u) cachedUrls.current.set(clipIdx + 1, u);
              });
            }
          }
        } else {
          setClipError(true);
        }
      } catch (err) {
        console.error("Error loading post-credits clip:", err);
        setClipError(true);
      } finally {
        setLoadingClip(false);
      }
    },
    [relationship?.id, mode]
  );

  // Start the compilation
  const handleStartCompilation = () => {
    pauseSiteSoundtrack();
    setIsPlayingCompilation(true);
    setCompilationFinished(false);
    setCurrentClipIndex(0);
    loadClip(0);
  };

  // Next clip handler (automatic sequence or manual skip)
  const handleNextClip = useCallback(() => {
    if (currentClipIndex + 1 < POST_CREDITS_CLIPS.length) {
      const nextIdx = currentClipIndex + 1;
      setCurrentClipIndex(nextIdx);
      loadClip(nextIdx);
    } else {
      // Completed all 6 clips!
      setCompilationFinished(true);
    }
  }, [currentClipIndex, loadClip]);

  // Previous clip handler
  const handlePrevClip = () => {
    if (currentClipIndex > 0) {
      const prevIdx = currentClipIndex - 1;
      setCurrentClipIndex(prevIdx);
      loadClip(prevIdx);
    }
  };

  // Replay current clip
  const handleReplayClip = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPaused(false);
    }
  };

  // Replay entire compilation
  const handleReplayCompilation = () => {
    pauseSiteSoundtrack();
    setCompilationFinished(false);
    setCurrentClipIndex(0);
    loadClip(0);
  };

  // Toggle video pause/play
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  };

  // Exit compilation back to review
  const handleExitCompilation = () => {
    setIsPlayingCompilation(false);
    setCompilationFinished(false);
    setClipUrl(null);
  };

  return (
    <Modal open title="Year One Relationship Review" onClose={onClose} wide>
      <div
        onKeyDown={(event) => {
          if (isPlayingCompilation) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            const step = event.key === "ArrowRight" ? 1 : -1;
            setIndex((current) => Math.max(0, Math.min(SLIDES.length, current + step)));
          }
        }}
      >
        {/* COMPILATION PLAYER VIEW */}
        {isPlayingCompilation ? (
          <div className="relative flex flex-col items-center justify-center space-y-4 py-2">
            {!compilationFinished ? (
              <div className="w-full max-w-sm space-y-3">
                {/* Top Bar: Progress Bars, Small Counter & Exit */}
                <div className="flex items-center justify-between gap-3 px-1">
                  {/* Small "1 / 6" Counter */}
                  <span className="rounded-full bg-midnight/80 px-3 py-1 text-xs font-mono font-bold text-blush border border-blush/30 shadow-sm backdrop-blur">
                    {currentClipIndex + 1} / {POST_CREDITS_CLIPS.length}
                  </span>

                  {/* 6 Story-style progress segments */}
                  <div className="flex flex-1 items-center gap-1">
                    {POST_CREDITS_CLIPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < currentClipIndex
                            ? "bg-blush"
                            : i === currentClipIndex
                            ? "bg-gold animate-pulse"
                            : "bg-lilac/25"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleExitCompilation}
                    className="rounded-full p-1 text-lilac/70 hover:bg-cloud/10 hover:text-cloud transition"
                    title="Exit compilation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Portrait Video Container */}
                <div className="relative mx-auto flex items-center justify-center aspect-[9/16] max-h-[60vh] sm:max-h-[66vh] w-full rounded-3xl overflow-hidden bg-black shadow-2xl border border-blush/25 select-none">
                  {loadingClip && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-midnight/90 text-xs text-lilac">
                      <Sparkles className="h-5 w-5 animate-spin text-gold" />
                      <span>Loading clip…</span>
                    </div>
                  )}

                  {clipError ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center bg-midnight/95 text-cloud">
                      <AlertCircle className="h-8 w-8 text-rose-400" />
                      <p className="text-sm font-semibold">This clip couldn’t load right now.</p>
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" variant="soft" onClick={() => loadClip(currentClipIndex)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry
                        </Button>
                        <Button size="sm" onClick={handleNextClip}>
                          Skip <SkipForward className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ) : clipUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        src={clipUrl}
                        playsInline
                        autoPlay
                        muted={false}
                        className="h-full w-full object-cover sm:object-contain cursor-pointer"
                        onEnded={handleNextClip}
                        onError={() => setClipError(true)}
                        onPlay={() => setIsPaused(false)}
                        onPause={() => setIsPaused(true)}
                        onClick={togglePlayPause}
                      />

                      {/* Pause Overlay Icon */}
                      {isPaused && (
                        <div
                          onClick={togglePlayPause}
                          className="absolute inset-0 z-10 flex items-center justify-center bg-midnight/30 cursor-pointer backdrop-blur-[2px]"
                        >
                          <div className="rounded-full bg-midnight/80 p-4 border border-blush/40 text-blush shadow-glow">
                            <Play className="h-8 w-8 fill-blush" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

                {/* Bottom Controls Bar */}
                <div className="flex items-center justify-between px-2 pt-1">
                  <button
                    type="button"
                    disabled={currentClipIndex === 0}
                    onClick={handlePrevClip}
                    className="text-xs text-lilac hover:text-cloud disabled:opacity-30 transition flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Prev
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="rounded-full bg-blush/20 p-2 text-blush hover:bg-blush/30 transition"
                      title={isPaused ? "Play" : "Pause"}
                    >
                      {isPaused ? <Play className="h-4 w-4 fill-blush" /> : <Pause className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleReplayClip}
                      className="rounded-full bg-midnight/80 p-2 text-lilac hover:text-gold border border-lilac/20 transition"
                      title="Replay this clip"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextClip}
                    className="text-xs text-lilac hover:text-cloud transition flex items-center gap-1"
                  >
                    Skip <SkipForward className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* FINALE SCREEN: "And that’s just six reasons." */
              <motion.article
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex min-h-[22rem] w-full max-w-md flex-col items-center justify-center gap-4 rounded-[28px] border border-blush/30 bg-gradient-to-br from-[#513350] via-[#322543] to-[#211831] px-6 py-10 text-center shadow-2xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blush/20 border border-blush/40 text-blush shadow-glow">
                  <Heart className="h-8 w-8 fill-blush" />
                </div>
                <h3 className="font-display text-3xl sm:text-4xl text-cream leading-tight">
                  And that’s just six reasons.
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-cloud">
                  Out of a whole universe of reasons why I love you. Happy first anniversary, Yukku. 💕
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <Button size="sm" variant="soft" onClick={handleReplayCompilation}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Replay compilation
                  </Button>
                  <Button size="sm" onClick={() => setIndex(0)}>
                    Back to review
                  </Button>
                </div>
              </motion.article>
            )}
          </div>
        ) : (
          /* STANDARD SLIDE VIEW OR POST-CREDITS INTRO */
          <div>
            {/* Top Slide Progress Dots */}
            <div className="mb-3 flex gap-1.5" aria-hidden="true">
              {SLIDES.map((item, i) => (
                <span
                  key={item.label}
                  className={`h-1 flex-1 rounded-full ${i <= index ? "bg-blush" : "bg-lilac/20"}`}
                />
              ))}
              {/* 7th sparkling segment for the post-credits scene */}
              <span
                className={`h-1 flex-1 rounded-full transition-colors ${
                  isPostCreditsCard ? "bg-gold shadow-glow" : "bg-lilac/20"
                }`}
              />
            </div>

            <div aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {isPostCreditsCard ? (
                  /* POST-CREDITS INTRO CARD */
                  <motion.article
                    key="post-credits-intro"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16 }}
                    className="flex min-h-[19rem] flex-col items-center justify-center gap-3.5 rounded-[24px] border border-gold/35 bg-gradient-to-br from-[#53304a] via-[#352243] to-[#201531] px-5 py-8 text-center sm:px-10 shadow-glow"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-gold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Bonus Feature
                    </p>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 border border-gold/40 text-gold shadow-sm">
                      <Film className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-3xl sm:text-4xl text-cream">
                      There’s a post-credits scene…
                    </h3>
                    <p className="text-base font-semibold text-blush">
                      Why I love her a lot
                    </p>
                    <p className="max-w-md text-xs sm:text-sm leading-relaxed text-cloud/90 pb-1">
                      Six moments from our camera roll that explain everything.
                    </p>
                    <div className="pt-2">
                      <Button
                        size="md"
                        onClick={handleStartCompilation}
                        className="bg-gradient-to-r from-blush via-gold to-blush text-midnight font-bold shadow-glow hover:brightness-110 px-6 py-2.5"
                      >
                        <Play className="h-4 w-4 mr-2 fill-midnight" /> Play the compilation
                      </Button>
                    </div>
                  </motion.article>
                ) : (
                  /* EXISTING SLIDES 1-6 */
                  <motion.article
                    key={slide!.label}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16 }}
                    className="flex min-h-[19rem] flex-col items-center justify-center gap-3 rounded-[24px] border border-blush/25 bg-gradient-to-br from-[#513350] via-[#322543] to-[#211831] px-5 py-8 text-center sm:px-10"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-blush">
                      {index + 1} / {SLIDES.length} · {slide!.label}
                    </p>
                    <Icon className="h-9 w-9 text-cream" aria-hidden="true" />
                    <h3 className="font-display text-4xl text-cream sm:text-5xl">{slide!.title}</h3>
                    <p className="text-sm font-semibold text-blush">{slide!.line}</p>
                    {slide!.icon === Camera && photo && (
                      <MediaImage
                        path={photo.path}
                        alt={photo.title}
                        className="max-h-40 max-w-full rounded-xl object-contain"
                      />
                    )}
                    <p className="max-w-md text-sm leading-relaxed text-cloud">{slide!.body}</p>
                  </motion.article>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="mt-4 flex justify-between gap-2">
              <Button
                variant="soft"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {isPostCreditsCard ? (
                <Button size="sm" onClick={() => setIndex(0)}>
                  Watch again from start
                </Button>
              ) : index === SLIDES.length - 1 ? (
                <Button size="sm" onClick={() => setIndex(SLIDES.length)}>
                  Post-credits scene <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIndex(index + 1)}>
                  Next slide <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
