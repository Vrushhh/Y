"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import { SoundtrackEmbed } from "@/components/SoundtrackEmbed";
import { toEmbedUrl } from "@/lib/embed";

const PAUSED_KEY = "olu:background-music-paused";

type Track = { id: string; title: string; artist?: string | null; url: string };
const MusicControls = createContext<{
  playing: boolean;
  toggle: () => void;
  selected: Track | null;
  select: (track: Track) => boolean;
} | null>(null);

export function useSoundtrackPlayer() {
  return useContext(MusicControls);
}

export function BackgroundMusic({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const audio = useRef<HTMLAudioElement>(null);
  const optedOut = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<Track | null>(null);
  const embed = toEmbedUrl(selected?.url);
  const hasEmbed = useRef(false);

  useEffect(() => {
    if (pathname === "/login") {
      setSelected(null);
      hasEmbed.current = false;
      audio.current?.pause();
      if (audio.current) audio.current.src = "/audio/intro.mp3";
    }
  }, [pathname]);

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
      if (!hasEmbed.current && !optedOut.current && track.paused) void track.play().catch(() => undefined);
    };
    const onFirstClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-music-control]")) return;
      playIfAllowed();
    };
    const stopAutoStart = () => document.removeEventListener("click", onFirstClick, true);
    const pauseForOtherMedia = (event: Event) => {
      if (event.target !== track && event.target instanceof HTMLMediaElement) {
        track.pause();
        if (hasEmbed.current) {
          hasEmbed.current = false;
          setSelected(null);
        }
      }
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

  const select = (song: Track) => {
    const track = audio.current;
    if (!track) return false;
    const provider = toEmbedUrl(song.url);
    if (!provider && !/^https?:\/\/[^?#]+\.(mp3|m4a|aac|ogg|wav|flac)(?:[?#]|$)/i.test(song.url)) return false;
    track.pause();
    hasEmbed.current = !!provider;
    setSelected(song);
    if (!provider) {
      track.src = song.url;
      void track.play().catch(() => undefined);
    }
    return true;
  };

  const stopEmbed = () => {
    hasEmbed.current = false;
    setSelected(null);
    if (audio.current) audio.current.src = "/audio/intro.mp3";
  };

  return (
    <MusicControls.Provider value={{ playing, toggle, selected, select }}>
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
      {embed && selected ? (
        <aside aria-label="Soundtrack player" className="glass fixed bottom-20 right-3 z-40 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl p-2 shadow-soft sm:bottom-5">
          <div className="flex items-center justify-between gap-2 px-2 pb-1">
            <span className="truncate text-sm">{selected.title}</span>
            <button type="button" onClick={stopEmbed} aria-label="Close soundtrack player" className="rounded p-1 hover:bg-cloud/15"><X className="h-4 w-4" /></button>
          </div>
          <SoundtrackEmbed key={embed} url={embed} title={selected.title} />
        </aside>
      ) : pathname !== "/universe" && <MusicButton />}
    </MusicControls.Provider>
  );
}

function MusicButton({ inline = false }: { inline?: boolean }) {
  const controls = useContext(MusicControls);
  if (!controls) return null;
  const { playing, toggle, selected } = controls;
  if (toEmbedUrl(selected?.url)) return null;
  const Icon = playing ? Pause : Play;

  return (
    <button
      type="button"
      data-music-control
      onClick={toggle}
      aria-label={playing ? "Pause background music" : "Play background music"}
      title={`${playing ? "Pause" : "Play"} ${selected?.title ?? "Until I Found You"}`}
      className={inline
        ? "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-midnight hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
        : "glass fixed bottom-20 right-4 z-40 grid h-11 w-11 place-items-center rounded-full text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush sm:bottom-5 sm:right-5"}
    >
      <Icon className="h-5 w-5" fill="currentColor" aria-hidden="true" />
    </button>
  );
}

export function DashboardMusicPlayer() {
  const track = useSoundtrackPlayer()?.selected;
  return (
    <section aria-label="Background music" className="glass mt-6 flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3">
      <MusicButton inline />
      <div className="min-w-0">
        <p className="text-xs text-lilac">Background music</p>
        <p className="font-display text-xl leading-tight text-cream">{track?.title ?? "Until I Found You"}</p>
        <p className="text-xs text-lilac">{track ? track.artist ?? "Our soundtrack" : "Stephen Sanchez · Instrumental"}</p>
      </div>
    </section>
  );
}
