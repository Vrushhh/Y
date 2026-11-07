"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera, CheckCircle2, Coins, Compass, Eye, Heart, HelpCircle,
  Maximize2, Minimize2, Palette, Send, Smile, Sparkles, Trophy,
  Unlock, Volume2, VolumeX, Wand2, X
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { useCollection, type Row } from "@/lib/useCollection";
import { Button, IconButton, Modal } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";
import { formatDate } from "@/lib/time";

type Memory = Row & {
  title: string;
  description?: string | null;
  location_name?: string | null;
  memory_date?: string | null;
  image_paths: string[];
  category: string;
  notes?: string | null;
};

type AvatarPos = {
  x: number;
  y: number;
  facing: "left" | "right";
  isMoving: boolean;
};

type Emote = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  sender: string;
};

type Whisper = {
  id: string;
  text: string;
  sender: string;
  expiresAt: number;
};

type Exhibit = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  x: number;
  y: number;
  type: "painting" | "fountain" | "statue" | "easel" | "bench" | "vault";
  memoryIndex?: number;
  question?: string;
  actionPrompt: string;
};

const MAP_WIDTH = 1100;
const MAP_HEIGHT = 650;

// Classical Romance Artworks used if couple hasn't uploaded photos yet
const CLASSICAL_ARTWORKS = [
  {
    title: "The Meeting of Hearts",
    artist: "The Impressionists",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    blurb: "Where two separate paths converged into a single brushstroke."
  },
  {
    title: "The Starlit Promenade",
    artist: "Celestial Series",
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80",
    blurb: "A quiet moment suspended in time, bathed in twilight glow."
  },
  {
    title: "The Architecture of Desire",
    artist: "Classical Roman Revival",
    image: "https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=800&auto=format&fit=crop&q=80",
    blurb: "Two marble silhouettes leaning together through centuries of whispers."
  }
];

export function VirtualMuseum() {
  const { userId, me, partner, relationship, mode, toast } = useApp();
  const { items: memories } = useCollection<Memory>("memories", { order: "memory_date" });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sound effects toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Local Avatar State
  const [myPos, setMyPos] = useState<AvatarPos>({ x: 280, y: 380, facing: "right", isMoving: false });
  const [partnerPos, setPartnerPos] = useState<AvatarPos>({ x: 330, y: 380, facing: "left", isMoving: false });
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [isHoldingHands, setIsHoldingHands] = useState(false);

  // Emotes & Speech Bubbles
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [myWhisper, setMyWhisper] = useState<Whisper | null>(null);
  const [partnerWhisper, setPartnerWhisper] = useState<Whisper | null>(null);
  const [whisperInput, setWhisperInput] = useState("");

  // Interactive Exhibits
  const [activeExhibit, setActiveExhibit] = useState<Exhibit | null>(null);
  const [curatorAnswer, setCuratorAnswer] = useState("");
  const [curatorSubmitted, setCuratorSubmitted] = useState(false);

  // Scavenger Hunt Quest
  const [scavengerProgress, setScavengerProgress] = useState<Record<string, boolean>>({
    genesis: false,
    fountain: false,
    wanderlust: false,
    easel: false
  });
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultModal, setVaultModal] = useState(false);

  // Shared Painting Canvas (Easel)
  const [drawingModal, setDrawingModal] = useState(false);
  const [drawColor, setDrawColor] = useState("#E8B9D0");
  const [isPainting, setIsPainting] = useState(false);

  // Wishing Fountain
  const [fountainWishes, setFountainWishes] = useState<string[]>([]);
  const [wishInput, setWishInput] = useState("");
  const [fountainModal, setFountainModal] = useState(false);

  // Interactive Museum Bench
  const [sittingTogether, setSittingTogether] = useState(false);

  // Map exhibit objects
  const exhibits: Exhibit[] = [
    {
      id: "genesis",
      title: memories[0]?.title || "The Genesis: Where It Began",
      subtitle: "Wing of Firsts · Masterpiece No. 1",
      description: memories[0]?.description || "The very first moment our universes aligned. A sacred chapter in the gallery of us.",
      x: 180,
      y: 190,
      type: "painting",
      memoryIndex: 0,
      question: "What was your favorite little detail about the day you met?",
      actionPrompt: "Inspect Masterpiece"
    },
    {
      id: "fountain",
      title: "The Grand Wishing Fountain",
      subtitle: "Central Rotunda · Marble & Starlight",
      description: "Throw a silver coin into the tranquil marble fountain and seal a secret wish for the two of you.",
      x: 550,
      y: 350,
      type: "fountain",
      actionPrompt: "Toss a Coin & Make a Wish"
    },
    {
      id: "statue",
      title: "The Eternal Silhouette",
      subtitle: "Sculpture Court · Hand-Carved Alabaster",
      description: "A classical statue depicting two figures holding hands through stormy winds, standing calm and unbreakable.",
      x: 390,
      y: 200,
      type: "statue",
      question: "If your love story was a famous work of art, what would its title be?",
      actionPrompt: "Examine Sculpture"
    },
    {
      id: "wanderlust",
      title: memories[1]?.title || "The Gallery of Wanderlust",
      subtitle: "Wing of Journeys · Masterpiece No. 2",
      description: memories[1]?.description || "Every journey taken together leaves footprints in our shared heart.",
      x: 880,
      y: 190,
      type: "painting",
      memoryIndex: 1,
      question: "What's the next dream city or starry viewpoint you want to explore together?",
      actionPrompt: "Inspect Painting"
    },
    {
      id: "easel",
      title: "The Lovers' Atelier",
      subtitle: "Studio East · Collaborative Canvas",
      description: "Pick up the digital brushes and leave your initials, a sketch, or a romantic doodle together on the canvas.",
      x: 930,
      y: 440,
      type: "easel",
      actionPrompt: "Paint Together on Easel"
    },
    {
      id: "bench",
      title: "The Velvet Lover's Bench",
      subtitle: "Quiet Alcove · Rest & Contemplate",
      description: "Take a seat next to each other, relax your feet, and gaze at the surrounding art together.",
      x: 550,
      y: 530,
      type: "bench",
      actionPrompt: "Sit Down Together"
    },
    {
      id: "vault",
      title: "The Grand Golden Vault",
      subtitle: "Curator's Treasury · Locked",
      description: "The secret vault containing the golden certificate of your shared universe. Complete all 4 scavenger clues to unlock!",
      x: 550,
      y: 110,
      type: "vault",
      actionPrompt: "Unlock Golden Vault"
    }
  ];

  // Synthesize gentle celestial museum chimes with Web Audio API
  const playSound = useCallback(
    (type: "step" | "chime" | "fountain" | "cheer" | "sit") => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (type === "step") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(140 + Math.random() * 30, now);
          gain.gain.setValueAtTime(0.015, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === "chime") {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.03, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.9);
          });
        } else if (type === "fountain") {
          // Water ripple sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (type === "sit") {
          // Velvet chime
          [440, 554.37, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.04, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 1.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 1.3);
          });
        }
      } catch {}
    },
    [soundEnabled]
  );

  // Setup Supabase Realtime Multiplayer Channel
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !relationship?.id) {
      // In preview/local mode without realtime, simulate partner presence
      setPartnerOnline(true);
      return;
    }

    const channel = sb.channel(`museum:${relationship.id}`, {
      config: { broadcast: { self: false } }
    });

    // Listen to partner's avatar movements
    channel.on("broadcast", { event: "pos" }, ({ payload }) => {
      setPartnerPos(payload);
    });

    // Listen to partner emotes
    channel.on("broadcast", { event: "emote" }, ({ payload }) => {
      setEmotes((list) => [...list, payload]);
      playSound("chime");
      setTimeout(() => {
        setEmotes((list) => list.filter((e) => e.id !== payload.id));
      }, 3500);
    });

    // Listen to partner whispers
    channel.on("broadcast", { event: "whisper" }, ({ payload }) => {
      setPartnerWhisper(payload);
      playSound("step");
      setTimeout(() => {
        setPartnerWhisper((curr) => (curr?.id === payload.id ? null : curr));
      }, 6000);
    });

    // Listen to shared activities (scavenger, drawing, fountain)
    channel.on("broadcast", { event: "scavenger" }, ({ payload }) => {
      setScavengerProgress((prev) => ({ ...prev, [payload.key]: true }));
      toast(`Your partner found the clue: ${payload.label}!`, "success");
      playSound("chime");
    });

    channel.on("broadcast", { event: "wish" }, ({ payload }) => {
      setFountainWishes((w) => [payload.text, ...w]);
      playSound("fountain");
    });

    channel.on("broadcast", { event: "paint_stroke" }, ({ payload }) => {
      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext("2d");
        if (ctx) {
          ctx.strokeStyle = payload.color;
          ctx.lineWidth = payload.width;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(payload.x1, payload.y1);
          ctx.lineTo(payload.x2, payload.y2);
          ctx.stroke();
        }
      }
    });

    // Presence tracking
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as unknown as { user_id: string }[];
        const hasPartner = users.some((u) => u.user_id !== userId);
        setPartnerOnline(hasPartner);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [relationship?.id, userId, playSound, toast]);

  // Check if all scavenger hunt clues are found
  useEffect(() => {
    const allFound = Object.values(scavengerProgress).every(Boolean);
    if (allFound && !vaultUnlocked) {
      setVaultUnlocked(true);
      playSound("chime");
      toast("🏆 All 4 clues solved! The Grand Golden Vault is now unlocked!", "success");
    }
  }, [scavengerProgress, vaultUnlocked, playSound, toast]);

  // Broadcast function helper
  const broadcast = useCallback(
    (event: string, payload: any) => {
      const sb = getSupabase();
      if (!sb || !relationship?.id) return;
      sb.channel(`museum:${relationship.id}`).send({
        type: "broadcast",
        event,
        payload
      });
    },
    [relationship?.id]
  );

  // Check proximity to exhibits
  const checkProximity = useCallback(
    (x: number, y: number) => {
      // If near velvet bench (x: 550, y: 530)
      if (Math.hypot(x - 550, y - 530) < 55) {
        setSittingTogether(true);
        playSound("sit");
      } else {
        setSittingTogether(false);
      }
    },
    [playSound]
  );

  // Smoothly move avatar to target coordinate
  const moveTo = useCallback(
    (targetX: number, targetY: number) => {
      const clampedX = Math.max(60, Math.min(MAP_WIDTH - 60, targetX));
      const clampedY = Math.max(90, Math.min(MAP_HEIGHT - 70, targetY));

      const facing = clampedX < myPos.x ? "left" : "right";
      const newPos: AvatarPos = { x: clampedX, y: clampedY, facing, isMoving: true };

      setMyPos(newPos);
      playSound("step");
      broadcast("pos", newPos);

      // If holding hands, partner follows smoothly alongside!
      if (isHoldingHands) {
        const offset = facing === "left" ? 45 : -45;
        const pPos: AvatarPos = { x: clampedX + offset, y: clampedY, facing, isMoving: true };
        setPartnerPos(pPos);
      }

      // Check proximity to any exhibits
      checkProximity(clampedX, clampedY);
    },
    [myPos.x, isHoldingHands, playSound, broadcast, checkProximity]
  );

  // Click on floor to walk
  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = MAP_WIDTH / rect.width;
    const scaleY = MAP_HEIGHT / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    moveTo(clickX, clickY);
  };

  // Keyboard navigation (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const speed = 28;
      let dx = 0,
        dy = 0;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dy -= speed;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dy += speed;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dx -= speed;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dx += speed;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        moveTo(myPos.x + dx, myPos.y + dy);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [myPos, moveTo]);

  // Send an Emote
  const sendEmote = (emoji: string) => {
    const emoteObj: Emote = {
      id: Math.random().toString(),
      emoji,
      x: myPos.x,
      y: myPos.y - 45,
      sender: me?.display_name || "You"
    };
    setEmotes((l) => [...l, emoteObj]);
    broadcast("emote", emoteObj);
    playSound("chime");
    setTimeout(() => {
      setEmotes((l) => l.filter((e) => e.id !== emoteObj.id));
    }, 3500);
  };

  // Send a Whisper speech bubble
  const sendWhisper = (text: string) => {
    if (!text.trim()) return;
    const whisperObj: Whisper = {
      id: Math.random().toString(),
      text: text.trim(),
      sender: me?.display_name || "You",
      expiresAt: Date.now() + 6000
    };
    setMyWhisper(whisperObj);
    broadcast("whisper", whisperObj);
    setWhisperInput("");
    playSound("step");
    setTimeout(() => {
      setMyWhisper((curr) => (curr?.id === whisperObj.id ? null : curr));
    }, 6000);
  };

  // Submit curator response
  const submitCuratorAnswer = () => {
    if (!curatorAnswer.trim()) return;
    setCuratorSubmitted(true);
    sendWhisper(`"${curatorAnswer.trim()}"`);
    toast("Answer shared with your partner in the museum!", "success");

    // Mark scavenger progress for genesis or statue
    if (activeExhibit?.id === "genesis") {
      setScavengerProgress((p) => ({ ...p, genesis: true }));
      broadcast("scavenger", { key: "genesis", label: "The Genesis" });
    }
  };

  // Fountain Wish
  const submitWish = () => {
    if (!wishInput.trim()) return;
    const wish = wishInput.trim();
    setFountainWishes((w) => [wish, ...w]);
    broadcast("wish", { text: wish });
    setWishInput("");
    setFountainModal(false);
    playSound("fountain");
    sendEmote("🪙");
    toast("Your coin splashed into the water! Wish sealed.", "success");

    setScavengerProgress((p) => ({ ...p, fountain: true }));
    broadcast("scavenger", { key: "fountain", label: "The Fountain" });
  };

  // Easel canvas drawing
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsPainting(true);
    lastPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !lastPoint.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();

      broadcast("paint_stroke", {
        x1: lastPoint.current.x,
        y1: lastPoint.current.y,
        x2: current.x,
        y2: current.y,
        color: drawColor,
        width: 3.5
      });
    }

    lastPoint.current = current;

    // Mark scavenger clue
    if (!scavengerProgress.easel) {
      setScavengerProgress((p) => ({ ...p, easel: true }));
      broadcast("scavenger", { key: "easel", label: "The Easel" });
    }
  };

  const endDraw = () => {
    setIsPainting(false);
    lastPoint.current = null;
  };

  // Clear canvas
  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Closeness calculation between partners
  const distanceBetweenPartners = Math.hypot(myPos.x - partnerPos.x, myPos.y - partnerPos.y);
  const isClose = distanceBetweenPartners < 90;

  return (
    <div className="relative mx-auto flex flex-col gap-4 select-none">
      {/* Museum Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl sm:text-4xl text-cloud flex items-center gap-2.5">
              <span>Musée de Notre Amour</span>
              <span className="text-xs font-sans rounded-full bg-blush/20 text-blush px-3 py-1 border border-blush/30">
                Live Virtual Space
              </span>
            </h1>
          </div>
          <p className="mt-1 text-sm text-lilac">
            Walk together through your private gallery in real time. Click anywhere on the marble floor to walk.
          </p>
        </div>

        {/* Presence & Controls */}
        <div className="flex items-center gap-2.5">
          <div className="glass-strong flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-cloud shadow-soft">
            <span
              className={`h-2.5 w-2.5 rounded-full ${partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-lilac/40"}`}
            />
            <span>
              {partnerOnline
                ? `${partner?.display_name || "Partner"} is here with you`
                : "Partner offline (Simulated companion active)"}
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
            className="rounded-full p-2 text-lilac glass hover:text-cloud transition"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Scavenger Hunt Banner */}
      <div className="glass-strong rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 border border-lilac/20 shadow-soft">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-blush shrink-0" />
          <div>
            <span className="text-xs font-medium text-cloud uppercase tracking-wider block">
              Curator’s Scavenger Quest
            </span>
            <span className="text-xs text-lilac">
              Find 4 exhibits together to unlock the Grand Golden Vault.
            </span>
          </div>
        </div>

        {/* Checklist */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { key: "genesis", label: "The Genesis" },
            { key: "fountain", label: "Wishing Fountain" },
            { key: "wanderlust", label: "Wanderlust" },
            { key: "easel", label: "Co-op Canvas" }
          ].map((item) => (
            <span
              key={item.key}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
                scavengerProgress[item.key]
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-cloud/5 text-lilac/70 border border-lilac/10"
              }`}
            >
              <CheckCircle2 className={`h-3 w-3 ${scavengerProgress[item.key] ? "text-emerald-400" : "opacity-30"}`} />
              {item.label}
            </span>
          ))}

          {vaultUnlocked && (
            <Button
              size="sm"
              onClick={() => setVaultModal(true)}
              className="bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200 text-midnight font-bold shadow-glow"
            >
              <Unlock className="h-3.5 w-3.5" /> Open Vault
            </Button>
          )}
        </div>
      </div>

      {/* Main Interactive Virtual Museum Canvas */}
      <div
        ref={containerRef}
        onClick={handleFloorClick}
        className="relative h-[65dvh] min-h-[520px] w-full overflow-hidden rounded-[28px] border border-lilac/20 shadow-2xl cursor-pointer"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, #2a2245 0%, #150f28 70%, #0c0817 100%)"
        }}
      >
        {/* Parquet & Marble Floor Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(201, 188, 232, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(201, 188, 232, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        />

        {/* Skylight illumination rays from ceiling */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 50% 15%, rgba(248, 232, 216, 0.18) 0%, transparent 60%),
              radial-gradient(circle at 20% 35%, rgba(232, 185, 208, 0.12) 0%, transparent 45%),
              radial-gradient(circle at 80% 35%, rgba(141, 120, 181, 0.15) 0%, transparent 45%)
            `
          }}
        />

        {/* Gallery Architecture Wall Moulding & Arches */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 border-b border-lilac/20 bg-midnight/60 backdrop-blur-sm flex justify-around items-center px-10">
          <div className="text-center">
            <span className="font-display text-sm tracking-widest text-lilac uppercase block">Wing A</span>
            <span className="text-xs text-cloud/70">The Hall of Firsts</span>
          </div>
          <div className="text-center">
            <span className="font-display text-sm tracking-widest text-blush uppercase block">Grand Rotunda</span>
            <span className="text-xs text-cloud/70">Sanctuary of Wishes</span>
          </div>
          <div className="text-center">
            <span className="font-display text-sm tracking-widest text-lilac uppercase block">Wing B</span>
            <span className="text-xs text-cloud/70">Wanderlust & Studio</span>
          </div>
        </div>

        {/* Interactive Exhibits Placed in the Museum */}
        {exhibits.map((ex) => {
          const isNear = Math.hypot(myPos.x - ex.x, myPos.y - ex.y) < 75;
          const memory = ex.memoryIndex !== undefined ? memories[ex.memoryIndex] : null;
          const fallbackArt = CLASSICAL_ARTWORKS[ex.memoryIndex ?? 0] || CLASSICAL_ARTWORKS[0];
          const hasImage = memory?.image_paths && memory.image_paths.length > 0;

          return (
            <div
              key={ex.id}
              onClick={(e) => {
                e.stopPropagation();
                moveTo(ex.x, ex.y + 35);
                if (ex.type === "fountain") setFountainModal(true);
                else if (ex.type === "easel") setDrawingModal(true);
                else if (ex.type === "vault") {
                  if (vaultUnlocked) setVaultModal(true);
                  else toast("Solve all 4 scavenger clues first to unlock the vault!", "info");
                } else setActiveExhibit(ex);
              }}
              style={{
                left: `${(ex.x / MAP_WIDTH) * 100}%`,
                top: `${(ex.y / MAP_HEIGHT) * 100}%`
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            >
              {/* Exhibit Visual Rendering */}
              {ex.type === "painting" && (
                <div className="relative">
                  {/* Ornate Gold Picture Frame */}
                  <div className="h-28 w-24 sm:h-32 sm:w-28 rounded-lg border-4 border-[#C5A059] bg-[#1a1428] shadow-2xl p-1.5 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-glow">
                    {hasImage ? (
                      <MediaImage
                        path={memory!.image_paths[0]}
                        alt={ex.title}
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <img
                        src={fallbackArt.image}
                        alt={ex.title}
                        className="h-full w-full object-cover rounded opacity-90"
                      />
                    )}
                  </div>
                  {/* Gallery Spot Light Beam */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-14 bg-gradient-to-b from-amber-200/25 to-transparent blur-sm" />
                  {/* Plaque below frame */}
                  <div className="mt-1 text-center">
                    <span className="inline-block rounded bg-[#0d0918]/85 px-2 py-0.5 text-[10px] text-amber-200/90 border border-amber-300/30 font-display truncate max-w-[110px]">
                      {ex.title}
                    </span>
                  </div>
                </div>
              )}

              {ex.type === "fountain" && (
                <div className="relative flex flex-col items-center">
                  {/* Marble Wishing Fountain */}
                  <div className="relative h-28 w-28 rounded-full border-4 border-[#D9D3E6] bg-gradient-to-tr from-cyan-900/60 via-sky-800/40 to-teal-900/60 shadow-glow flex items-center justify-center overflow-hidden">
                    {/* Water ripple circles */}
                    <div className="absolute inset-1 rounded-full border border-sky-300/30 animate-ping opacity-35" />
                    <div className="absolute inset-4 rounded-full border border-teal-200/40 animate-pulse" />
                    {/* Fountain spout / angel */}
                    <div className="relative z-10 flex flex-col items-center">
                      <Coins className="h-6 w-6 text-amber-200 drop-shadow animate-bounce" />
                      <span className="text-[10px] text-cyan-200 font-display">Wishing Well</span>
                    </div>
                  </div>
                  {/* Shimmer water reflection on floor */}
                  <div className="pointer-events-none absolute -bottom-2 h-6 w-32 rounded-full bg-cyan-400/15 blur-md" />
                </div>
              )}

              {ex.type === "statue" && (
                <div className="relative flex flex-col items-center">
                  {/* Classical Marble Pedestal */}
                  <div className="h-20 w-16 rounded-t-md border border-lilac/30 bg-gradient-to-b from-cloud/20 to-deep/40 shadow-xl flex flex-col items-center justify-center p-2 group-hover:scale-105 transition-transform">
                    <Heart className="h-7 w-7 text-blush drop-shadow animate-pulse" />
                    <span className="text-[9px] text-lilac/90 font-serif mt-1">Sculpture</span>
                  </div>
                  <div className="h-3 w-20 rounded-sm bg-deep/80 border border-lilac/30 shadow" />
                </div>
              )}

              {ex.type === "easel" && (
                <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform">
                  {/* Wooden Art Easel with Canvas */}
                  <div className="h-24 w-20 rounded border-2 border-amber-600/80 bg-[#fdfbf7] p-1 shadow-2xl flex flex-col items-center justify-center">
                    <Palette className="h-6 w-6 text-rose-500 animate-spin" style={{ animationDuration: "12s" }} />
                    <span className="text-[9px] text-stone-800 font-sans font-bold mt-1">Our Easel</span>
                  </div>
                  {/* Easel Tripod Legs */}
                  <div className="flex gap-3 -mt-1">
                    <div className="h-6 w-1 bg-amber-800/80 rotate-12" />
                    <div className="h-6 w-1 bg-amber-800/80 -rotate-12" />
                  </div>
                </div>
              )}

              {ex.type === "bench" && (
                <div className="relative flex flex-col items-center">
                  {/* Velvet Museum Bench */}
                  <div
                    className={`h-11 w-32 rounded-full border border-rose-300/40 shadow-xl flex items-center justify-center px-3 transition-colors ${
                      sittingTogether
                        ? "bg-gradient-to-r from-rose-900/90 via-blush/80 to-rose-900/90 shadow-glow"
                        : "bg-[#4a1c31]/85 group-hover:bg-[#5e233f]"
                    }`}
                  >
                    <span className="text-xs text-rose-100 font-display">
                      {sittingTogether ? "Sitting Together 💕" : "Velvet Bench"}
                    </span>
                  </div>
                </div>
              )}

              {ex.type === "vault" && (
                <div className="relative flex flex-col items-center group-hover:scale-105 transition-transform">
                  <div
                    className={`h-16 w-20 rounded-t-2xl border-2 flex flex-col items-center justify-center p-1 shadow-2xl ${
                      vaultUnlocked
                        ? "border-amber-300 bg-gradient-to-b from-amber-500/40 to-amber-900/60 shadow-glow"
                        : "border-lilac/30 bg-midnight/80"
                    }`}
                  >
                    {vaultUnlocked ? (
                      <Unlock className="h-6 w-6 text-amber-300 animate-bounce" />
                    ) : (
                      <Trophy className="h-6 w-6 text-lilac/50" />
                    )}
                    <span className="text-[9px] text-cloud font-display mt-0.5">
                      {vaultUnlocked ? "Vault Open" : "Curator Vault"}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Prompt Pill when near */}
              <AnimatePresence>
                {isNear && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blush px-3 py-1 text-[11px] font-bold text-midnight shadow-glow"
                  >
                    {ex.actionPrompt}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Floating Heart / Emote Particles over Avatars */}
        {emotes.map((em) => (
          <motion.div
            key={em.id}
            initial={{ opacity: 1, y: 0, scale: 0.6 }}
            animate={{ opacity: 0, y: -70, scale: 1.4 }}
            transition={{ duration: 2.8, ease: "easeOut" }}
            style={{
              left: `${(em.x / MAP_WIDTH) * 100}%`,
              top: `${(em.y / MAP_HEIGHT) * 100}%`
            }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl z-40"
          >
            {em.emoji}
          </motion.div>
        ))}

        {/* My Speech / Whisper Bubble */}
        <AnimatePresence>
          {myWhisper && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                left: `${(myPos.x / MAP_WIDTH) * 100}%`,
                top: `${((myPos.y - 65) / MAP_HEIGHT) * 100}%`
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl bg-cloud px-3.5 py-1.5 text-xs font-medium text-midnight shadow-soft max-w-[200px] text-center"
            >
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-cloud" />
              {myWhisper.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partner Speech / Whisper Bubble */}
        <AnimatePresence>
          {partnerWhisper && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                left: `${(partnerPos.x / MAP_WIDTH) * 100}%`,
                top: `${((partnerPos.y - 65) / MAP_HEIGHT) * 100}%`
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl bg-blush px-3.5 py-1.5 text-xs font-medium text-midnight shadow-glow max-w-[200px] text-center"
            >
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-blush" />
              {partnerWhisper.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Handholding / Closeness Glow aura between partners */}
        {isClose && (
          <div
            style={{
              left: `${((myPos.x + partnerPos.x) / 2 / MAP_WIDTH) * 100}%`,
              top: `${((myPos.y + partnerPos.y) / 2 / MAP_HEIGHT) * 100}%`
            }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-16 w-24 rounded-full bg-blush/20 blur-xl animate-pulse"
          />
        )}

        {/* My Avatar */}
        <div
          style={{
            left: `${(myPos.x / MAP_WIDTH) * 100}%`,
            top: `${(myPos.y / MAP_HEIGHT) * 100}%`,
            transition: "left 0.22s ease-out, top 0.22s ease-out"
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
        >
          {/* Avatar Shadow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2.5 w-8 rounded-full bg-midnight/70 blur-[2px]" />

          {/* Avatar Body */}
          <div className="relative flex flex-col items-center">
            {/* Name pill */}
            <span className="mb-1 rounded-full bg-midnight/90 px-2 py-0.5 text-[10px] font-medium text-cream border border-blush/40 shadow-soft">
              {me?.display_name || "You"}
            </span>

            {/* Character Sprite Illustration */}
            <div
              className={`h-11 w-11 rounded-full border-2 border-blush bg-gradient-to-tr from-[#3b2a54] to-[#785994] shadow-glow flex items-center justify-center text-lg ${
                myPos.facing === "left" ? "-scale-x-100" : "scale-x-100"
              }`}
            >
              🧑‍🎨
            </div>
          </div>
        </div>

        {/* Partner's Avatar */}
        <div
          style={{
            left: `${(partnerPos.x / MAP_WIDTH) * 100}%`,
            top: `${(partnerPos.y / MAP_HEIGHT) * 100}%`,
            transition: "left 0.22s ease-out, top 0.22s ease-out"
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
        >
          {/* Partner Shadow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2.5 w-8 rounded-full bg-midnight/70 blur-[2px]" />

          {/* Partner Body */}
          <div className="relative flex flex-col items-center">
            {/* Partner Name pill */}
            <span className="mb-1 rounded-full bg-midnight/90 px-2 py-0.5 text-[10px] font-medium text-blush border border-lilac/40 shadow-soft">
              {partner?.display_name || "Your person"}
            </span>

            {/* Partner Character Sprite */}
            <div
              className={`h-11 w-11 rounded-full border-2 border-lilac bg-gradient-to-tr from-[#5a3861] to-[#99628a] shadow-glow flex items-center justify-center text-lg ${
                partnerPos.facing === "left" ? "-scale-x-100" : "scale-x-100"
              }`}
            >
              👩‍🎨
            </div>
          </div>
        </div>
      </div>

      {/* Museum Bottom Interactive Control Deck */}
      <div className="glass-strong rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-soft border border-lilac/15">
        {/* Quick Emote Triggers */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-lilac font-medium mr-1 hidden sm:inline">Reactions:</span>
          {["❤️", "💋", "✨", "🥂", "🎨", "📸", "🥰"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmote(emoji)}
              className="rounded-full p-2 text-lg hover:scale-125 transition-transform hover:bg-cloud/10"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Handholding Mode Toggle */}
        <button
          onClick={() => {
            setIsHoldingHands((v) => !v);
            if (!isHoldingHands) {
              playSound("sit");
              toast("Holding hands! You are now walking side by side.", "success");
            }
          }}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition ${
            isHoldingHands
              ? "bg-blush text-midnight shadow-glow"
              : "glass text-lilac hover:text-cloud hover:bg-cloud/10"
          }`}
        >
          <Heart className="h-3.5 w-3.5 fill-current" />
          <span>{isHoldingHands ? "Holding Hands ❤️" : "Hold Hands"}</span>
        </button>

        {/* Quick Whisper Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={whisperInput}
            onChange={(e) => setWhisperInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendWhisper(whisperInput)}
            placeholder="Whisper in the museum..."
            className="rounded-full border border-lilac/25 bg-midnight/60 px-4 py-1.5 text-xs text-cloud placeholder:text-lilac/50 focus:border-blush focus:outline-none w-full sm:w-56"
          />
          <IconButton label="Send whisper" onClick={() => sendWhisper(whisperInput)}>
            <Send className="h-4 w-4 text-blush" />
          </IconButton>
        </div>
      </div>

      {/* Modal: Exhibit Inspection & Curator Question */}
      <Modal open={!!activeExhibit} onClose={() => setActiveExhibit(null)} title={activeExhibit?.title || "Exhibit"}>
        {activeExhibit && (
          <div className="space-y-4">
            <span className="text-xs text-blush font-mono block">{activeExhibit.subtitle}</span>

            {/* Exhibit Artwork Display */}
            {activeExhibit.type === "painting" && (
              <div className="overflow-hidden rounded-2xl border-4 border-[#C5A059] bg-midnight shadow-glow">
                {memories[activeExhibit.memoryIndex ?? 0]?.image_paths?.length ? (
                  <MediaImage
                    path={memories[activeExhibit.memoryIndex ?? 0].image_paths[0]}
                    alt={activeExhibit.title}
                    className="max-h-[38dvh] w-full object-contain"
                  />
                ) : (
                  <img
                    src={CLASSICAL_ARTWORKS[activeExhibit.memoryIndex ?? 0]?.image}
                    alt={activeExhibit.title}
                    className="max-h-[38dvh] w-full object-cover"
                  />
                )}
              </div>
            )}

            <p className="text-sm leading-relaxed text-cloud/90">{activeExhibit.description}</p>

            {/* Curator Question for Date Mode */}
            {activeExhibit.question && (
              <div className="rounded-2xl border border-blush/30 bg-blush/10 p-4 space-y-2">
                <span className="text-xs uppercase tracking-wider text-blush font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Curator’s Audio Tour Prompt
                </span>
                <p className="text-sm font-display text-cloud font-medium">{activeExhibit.question}</p>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={curatorAnswer}
                    onChange={(e) => setCuratorAnswer(e.target.value)}
                    placeholder="Whisper your answer..."
                    className="flex-1 rounded-xl border border-lilac/30 bg-midnight/80 px-3.5 py-2 text-xs text-cloud placeholder:text-lilac/50 focus:border-blush focus:outline-none"
                  />
                  <Button size="sm" onClick={submitCuratorAnswer}>
                    Share
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: The Wishing Fountain */}
      <Modal open={fountainModal} onClose={() => setFountainModal(false)} title="The Grand Wishing Fountain">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            <Coins className="h-8 w-8 animate-bounce" />
          </div>
          <p className="text-sm text-cloud/90">
            Tradition says that when two lovers toss a silver coin together, the universe takes note of their wish.
          </p>

          <div className="space-y-2 text-left">
            <label className="text-xs text-lilac block">Inscribe your wish for our future:</label>
            <input
              type="text"
              value={wishInput}
              onChange={(e) => setWishInput(e.target.value)}
              placeholder="e.g. Next summer in Italy, growing old together..."
              className="w-full rounded-2xl border border-lilac/25 bg-midnight/80 px-4 py-2.5 text-sm text-cloud placeholder:text-lilac/50 focus:border-blush focus:outline-none"
            />
          </div>

          <Button className="w-full" onClick={submitWish}>
            Toss Coin into Fountain
          </Button>

          {/* Past Wishes Floating in the Water */}
          {fountainWishes.length > 0 && (
            <div className="mt-4 border-t border-lilac/15 pt-3 text-left">
              <span className="text-xs text-lilac font-medium block mb-2">Wishes in the water:</span>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {fountainWishes.map((w, idx) => (
                  <li key={idx} className="rounded-xl bg-cloud/5 px-3 py-1.5 text-xs text-cream flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-300 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Collaborative Art Studio (Easel) */}
      <Modal open={drawingModal} onClose={() => setDrawingModal(false)} title="The Lovers' Shared Canvas">
        <div className="space-y-4">
          <p className="text-xs text-lilac">
            Draw, write your initials, or sketch hearts together on the easel in real time.
          </p>

          {/* Color Palette */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-lilac">Brush color:</span>
              {["#E8B9D0", "#C9BCE8", "#FCD34D", "#34D399", "#60A5FA", "#FFFFFF"].map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    drawColor === c ? "scale-125 border-cloud" : "border-transparent"
                  }`}
                />
              ))}
            </div>

            <Button size="sm" variant="ghost" onClick={clearCanvas}>
              Clear
            </Button>
          </div>

          {/* Drawing Canvas */}
          <div className="rounded-2xl border-4 border-amber-800/80 bg-[#fdfbf7] p-1 shadow-inner overflow-hidden flex justify-center">
            <canvas
              ref={canvasRef}
              width={460}
              height={260}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              className="cursor-crosshair touch-none w-full max-w-[460px] h-[260px] bg-white rounded-lg"
            />
          </div>

          <Button className="w-full" onClick={() => setDrawingModal(false)}>
            Finished Painting
          </Button>
        </div>
      </Modal>

      {/* Modal: The Golden Vault Victory */}
      <Modal open={vaultModal} onClose={() => setVaultModal(false)} title="The Grand Golden Vault">
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 border-2 border-amber-300 shadow-glow">
            <Trophy className="h-10 w-10 animate-pulse text-amber-300" />
          </div>

          <h2 className="font-display text-2xl text-cloud">
            Certified Curators of Our Universe
          </h2>

          <p className="text-sm leading-relaxed text-cloud/90 max-w-sm mx-auto">
            You both explored every corner of the gallery, tossed your coins into the fountain, answered each other’s whispers, and created art together.
          </p>

          <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 font-romance italic text-amber-200 text-lg">
            “In a world of billions of people, you are my favorite masterpiece.”
          </div>

          <Button className="w-full bg-gradient-to-r from-amber-300 to-rose-300 text-midnight font-bold" onClick={() => setVaultModal(false)}>
            Keep Exploring Together
          </Button>
        </div>
      </Modal>
    </div>
  );
}
