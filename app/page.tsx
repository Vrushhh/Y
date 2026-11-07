"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Starfield } from "@/components/Starfield";
import { Envelope } from "@/components/Envelope";
import { Counter } from "@/components/Counter";
import { Typewriter } from "@/components/Typewriter";
import { Button } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

const MESSAGE = "Somewhere between hello and today, you became my favourite person.";
const MUSIC_SRC = "/audio/intro.mp3"; // Optional: add your own licensed track at public/audio/intro.mp3

export default function Welcome() {
  const router = useRouter();
  const { startDate, mode, userId, relationship } = useApp();
  const [stage, setStage] = useState<"closed" | "opening" | "open">("closed");
  const [typed, setTyped] = useState(false);
  const [seen, setSeen] = useState(false);
  const [musicAvailable, setMusicAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSeen(localStorage.getItem("olu:intro-done") === "1");
    fetch(MUSIC_SRC, { method: "HEAD" }).then((r) => setMusicAvailable(r.ok)).catch(() => setMusicAvailable(false));
  }, []);

  const toggleMusic = () => {
    if (!audio.current) { audio.current = new Audio(MUSIC_SRC); audio.current.loop = true; audio.current.volume = 0.5; }
    if (playing) { audio.current.pause(); setPlaying(false); }
    else { audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };
  useEffect(() => () => audio.current?.pause(), []);

  const open = () => {
    if (stage !== "closed") return;
    setStage("opening");
    setTimeout(() => setStage("open"), 850);
  };

  const enter = async () => {
    localStorage.setItem("olu:intro-done", "1");
    if (mode === "supabase" && userId && relationship) {
      getSupabase()!.from("user_preferences").upsert({ user_id: userId, intro_completed: true }, { onConflict: "user_id" }).then(() => undefined);
    }
    router.push(mode === "supabase" && !userId ? "/login" : "/universe");
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Starfield density={1.3} />

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1.2 }} className="absolute top-10 font-display text-lg italic tracking-wide text-lilac/80">
        Our Little Universe
      </motion.p>

      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <motion.div key="envelope" className="flex flex-col items-center" exit={{ opacity: 0, y: 40, scale: 0.92 }} transition={{ duration: 0.5 }}>
            <motion.button
              onClick={open}
              aria-label="Open the envelope"
              className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70 focus-visible:ring-offset-8 focus-visible:ring-offset-midnight"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: "easeOut" }}
              whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}
            >
              <div className="animate-float"><Envelope open={stage === "opening"} glow /></div>
            </motion.button>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-10 text-sm text-lilac">
              Tap the envelope
            </motion.p>
            {seen && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} onClick={enter} className="mt-4 text-sm text-blush underline-offset-4 hover:underline">
                Skip to our universe
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            initial={{ opacity: 0, y: 60, rotateX: 25 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="paper w-full max-w-lg rounded-[18px] px-8 py-10 text-center sm:px-12"
          >
            <Typewriter text={MESSAGE} className="mx-auto max-w-sm font-romance text-2xl italic leading-relaxed text-[#3a2f4f] sm:text-[28px]" onDone={() => setTyped(true)} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: typed ? 1 : 0 }} transition={{ duration: 0.8 }} className="mt-8 [&_*]:!text-[#4d3f66]">
              <Counter start={startDate} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 8 }} transition={{ delay: 0.4 }} className="mt-8 flex flex-col items-center gap-3">
              <Button size="lg" onClick={enter} disabled={!typed}>Enter our universe</Button>
              <button onClick={() => { setStage("closed"); setTyped(false); }} className="text-sm text-[#6b5a86] underline-offset-4 hover:underline">Replay the intro</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {musicAvailable && (
        <button onClick={toggleMusic} className="glass absolute bottom-6 right-6 rounded-full p-3 text-lilac hover:text-cloud" aria-label={playing ? "Pause music" : "Play music"}>
          {playing ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      )}
    </main>
  );
}
