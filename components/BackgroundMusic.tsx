"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const PAUSED_KEY = "olu:background-music-paused";

export function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const control = useRef<HTMLButtonElement>(null);
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
      if (control.current?.contains(event.target as Node)) return;
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
    <>
      <audio
        ref={audio}
        src="/audio/intro.mp3"
        loop
        preload="none"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPlaying(false)}
      />
      <button
        ref={control}
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause background music" : "Play background music"}
        title={playing ? "Pause Until I Found You" : "Play Until I Found You"}
        className="glass fixed bottom-20 right-4 z-40 grid h-11 w-11 place-items-center rounded-full text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush sm:bottom-5 sm:right-5"
      >
        {playing ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
      </button>
    </>
  );
}
