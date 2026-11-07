"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play } from "lucide-react";

const PAUSED_KEY = "olu:background-music-paused";

const MusicControls = createContext<{ playing: boolean; toggle: () => void } | null>(null);

export function BackgroundMusic({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const audio = useRef<HTMLAudioElement>(null);
  const optedOut = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const track = audio.current;
    if (!track) return;

    track.volume = 0.25;
    try {
      optedOut.current = localStorage.getItem(PAUSED_KEY) === "1";
    } catch {
      // Playback still works when browser storage is unavailable.
    }

    const playIfAllowed = () => {
      if (!optedOut.current && track.paused) void track.play().catch(() => undefined);
    };
    const onFirstClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-music-control]")) return;
      playIfAllowed();
    };
    const stopAutoStart = () => document.removeEventListener("click", onFirstClick, true);
    const pauseForOtherMedia = (event: Event) => {
      if (event.target !== track && event.target instanceof HTMLMediaElement) track.pause();
    };

    document.addEventListener("click", onFirstClick, true);
    document.addEventListener("play", pauseForOtherMedia, true);
    track.addEventListener("playing", stopAutoStart);
    playIfAllowed();
    return () => {
      stopAutoStart();
      document.removeEventListener("play", pauseForOtherMedia, true);
      track.removeEventListener("playing", stopAutoStart);
      track.pause();
    };
  }, []);

  const toggle = () => {
    const track = audio.current;
    if (!track) return;

    optedOut.current = !track.paused;
    try {
      localStorage.setItem(PAUSED_KEY, optedOut.current ? "1" : "0");
    } catch {
      // The button also works without a persistent preference.
    }

    if (optedOut.current) track.pause();
    else void track.play().catch(() => undefined);
  };

  return (
    <MusicControls.Provider value={{ playing, toggle }}>
      {children}
      <audio
        ref={audio}
        src="/audio/intro.mp3"
        loop
        preload="none"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPlaying(false)}
      />
      {pathname !== "/universe" && <MusicButton />}
    </MusicControls.Provider>
  );
}

function MusicButton({ inline = false }: { inline?: boolean }) {
  const controls = useContext(MusicControls);
  if (!controls) return null;
  const { playing, toggle } = controls;
  const Icon = playing ? Pause : Play;

  return (
    <button
      type="button"
      data-music-control
      onClick={toggle}
      aria-label={playing ? "Pause background music" : "Play background music"}
      title={playing ? "Pause Until I Found You" : "Play Until I Found You"}
      className={inline
        ? "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-midnight hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
        : "glass fixed bottom-20 right-4 z-40 grid h-11 w-11 place-items-center rounded-full text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush sm:bottom-5 sm:right-5"}
    >
      <Icon className="h-5 w-5" fill="currentColor" aria-hidden="true" />
    </button>
  );
}

export function DashboardMusicPlayer() {
  return (
    <section aria-label="Background music" className="glass mt-6 flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3">
      <MusicButton inline />
      <div className="min-w-0">
        <p className="text-xs text-lilac">Background music</p>
        <p className="font-display text-xl leading-tight text-cream">Until I Found You</p>
        <p className="text-xs text-lilac">Stephen Sanchez · Instrumental</p>
      </div>
    </section>
  );
}
