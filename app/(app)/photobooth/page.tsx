"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CameraOff,
  Download,
  Eye,
  Heart,
  Layers,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  SwitchCamera,
  Trash2,
  User,
  Users
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { useCollection, type Row } from "@/lib/useCollection";
import { uploadMedia } from "@/lib/media";
import { applyFilter, FILTERS, type FilterName } from "@/lib/filters";
import { Button, Field, Input, Modal, PageHeader } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";
import { PhotoRotation } from "./PhotoRotation";

const STRIP_SHOTS = 4;
const STRIP_W = 480;
const STRIP_H = 360;

const FRAMES = [
  { key: "cream", label: "Classic White", bg: "#FAF8F5", ink: "#2D253E" },
  { key: "blush", label: "Rose Blush", bg: "#F7E4EC", ink: "#3D2736" },
  { key: "lilac", label: "Lavender", bg: "#E7DEF2", ink: "#241C33" },
  { key: "night", label: "Midnight", bg: "#1E172E", ink: "#FAF6F2" },
  { key: "butter", label: "Warm Butter", bg: "#F6EED8", ink: "#3D3425" }
];

const STICKERS = ["none", "stars", "hearts", "moon"] as const;
type Sticker = (typeof STICKERS)[number];

type Strip = Row & {
  image_path: string;
  caption?: string | null;
  created_by?: string | null;
};

function playShutterSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, bg: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function Photobooth() {
  const { mode, relationship, toast, members, me, partner, userId, email } = useApp();
  const strips = useCollection<Strip>("photo_strips", { order: "created_at", ascending: false });

  // Partner identification
  const isSonu = email === "vrushabhcr7@gmail.com";
  const sonuMember = members.find(
    (m) =>
      m.display_name?.toLowerCase().includes("sonu") ||
      m.display_name?.toLowerCase().includes("vrushabh") ||
      (isSonu && m.user_id === userId)
  );
  const yukkuMember = members.find(
    (m) =>
      m.display_name?.toLowerCase().includes("yuk") ||
      m.user_id !== sonuMember?.user_id
  );

  const myDisplayName = me?.display_name || (isSonu ? "Sonu" : "Yukku");
  const partnerDisplayName = partner?.display_name || (isSonu ? "Yukku" : "Sonu");

  // Camera & Mode States
  const [cameraMode, setCameraMode] = useState<"polaroid" | "strip">("polaroid");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied" | "unsupported">("off");
  const [filter, setFilter] = useState<FilterName>("dreamy");
  const [frame, setFrame] = useState(FRAMES[0]);
  const [sticker, setSticker] = useState<Sticker>("stars");
  const [caption, setCaption] = useState("");
  const [shots, setShots] = useState<ImageData[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [strip, setStrip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [instantSnap, setInstantSnap] = useState(false);

  // Gallery tabs & lightbox
  const [activeTab, setActiveTab] = useState<"all" | "yukku" | "sonu">("all");
  const [selectedPhoto, setSelectedPhoto] = useState<Strip | null>(null);

  // Snapping Persona (allows testing both sides in preview or on one device)
  const [snappingAs, setSnappingAs] = useState<"me" | "sonu" | "yukku">("me");

  const effectiveAuthorName =
    snappingAs === "sonu"
      ? sonuMember?.display_name || "Sonu"
      : snappingAs === "yukku"
      ? yukkuMember?.display_name || "Yukku"
      : myDisplayName;

  const effectiveAuthorId =
    snappingAs === "sonu"
      ? sonuMember?.user_id || userId
      : snappingAs === "yukku"
      ? yukkuMember?.user_id || "yukku-id"
      : userId;

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (camera === "on" && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => undefined);
    }
  }, [camera]);

  const start = async (modeFacing: "user" | "environment" = facingMode) => {
    stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    setCamera("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modeFacing,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });
      stream.current = s;
      setCamera("on");
    } catch (e) {
      setCamera((e as DOMException).name === "NotAllowedError" ? "denied" : "unsupported");
    }
  };

  const toggleFacing = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (camera === "on") void start(nextMode);
  };

  // Capture frame from video
  const grab = (squareCrop = false): ImageData | null => {
    const v = video.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;

    if (squareCrop) {
      const targetSize = 480;
      c.width = targetSize;
      c.height = targetSize;
      const minDim = Math.min(v.videoWidth, v.videoHeight);
      const sx = (v.videoWidth - minDim) / 2;
      const sy = (v.videoHeight - minDim) / 2;

      if (facingMode === "user") {
        ctx.translate(targetSize, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
      return ctx.getImageData(0, 0, targetSize, targetSize);
    } else {
      c.width = STRIP_W;
      c.height = STRIP_H;
      const ratio = STRIP_W / STRIP_H;
      const vr = v.videoWidth / v.videoHeight;
      const sw = vr > ratio ? v.videoHeight * ratio : v.videoWidth;
      const sh = vr > ratio ? v.videoHeight : v.videoWidth / ratio;

      if (facingMode === "user") {
        ctx.translate(STRIP_W, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, STRIP_W, STRIP_H);
      return ctx.getImageData(0, 0, STRIP_W, STRIP_H);
    }
  };

  // Compose authentic 1-shot Polaroid
  const composePolaroid = useCallback(
    (shot: ImageData): string => {
      const PW = 520;
      const PH = 640;
      const pad = 32;
      const photoSize = PW - pad * 2; // 456 x 456 square

      const c = document.createElement("canvas");
      c.width = PW;
      c.height = PH;
      const ctx = c.getContext("2d")!;

      // 1. Polaroid paper background with soft tone
      ctx.fillStyle = frame.bg;
      ctx.fillRect(0, 0, PW, PH);

      // 2. Subtle drop shadow recess for photo
      ctx.fillStyle = "#00000015";
      ctx.fillRect(pad - 1, pad - 1, photoSize + 2, photoSize + 2);

      // 3. Render photo with filter
      const shotCanvas = document.createElement("canvas");
      shotCanvas.width = shot.width;
      shotCanvas.height = shot.height;
      const shotCtx = shotCanvas.getContext("2d")!;
      const copy = new ImageData(new Uint8ClampedArray(shot.data), shot.width, shot.height);
      applyFilter(copy.data, filter);
      shotCtx.putImageData(copy, 0, 0);

      ctx.drawImage(shotCanvas, 0, 0, shot.width, shot.height, pad, pad, photoSize, photoSize);

      // 4. Vintage Polaroid glossy diagonal sheen
      const glossGrad = ctx.createLinearGradient(pad, pad, pad + 180, pad + 180);
      glossGrad.addColorStop(0, "rgba(255,255,255,0.16)");
      glossGrad.addColorStop(0.4, "rgba(255,255,255,0.03)");
      glossGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glossGrad;
      ctx.fillRect(pad, pad, photoSize, photoSize);

      // 5. Stickers
      ctx.fillStyle = frame.ink;
      ctx.globalAlpha = 0.9;
      if (sticker === "stars") {
        [[pad + 28, pad + 28, 14], [PW - pad - 28, pad + 32, 11], [PW - pad - 36, pad + photoSize - 32, 13]].forEach(
          ([x, y, r]) => drawStar(ctx, x, y, r)
        );
      } else if (sticker === "hearts") {
        [[PW - pad - 32, pad + 28, 24], [pad + 32, pad + photoSize - 24, 20]].forEach(([x, y, s]) =>
          drawHeart(ctx, x, y, s)
        );
      } else if (sticker === "moon") {
        drawMoon(ctx, PW - pad - 36, pad + 36, 18, frame.bg);
      }
      ctx.globalAlpha = 1;

      // 6. Handwritten Caption & Signature in bottom area
      const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
      const hand = css?.getPropertyValue("--font-caveat").trim() || "Caveat, cursive";
      const sans = css?.getPropertyValue("--font-dmsans").trim() || "DM Sans, sans-serif";

      ctx.fillStyle = frame.ink;
      ctx.textAlign = "center";

      // Caption
      const displayCaption = caption.trim() || "our little universe";
      ctx.font = `34px ${hand}`;
      ctx.fillText(displayCaption, PW / 2, pad + photoSize + 54);

      // Signature & Date
      ctx.font = `14px ${sans}`;
      ctx.globalAlpha = 0.65;
      const dateFormatted = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const authorLine = `Snapped by ${effectiveAuthorName} • ${dateFormatted}`;
      ctx.fillText(authorLine, PW / 2, pad + photoSize + 96);
      ctx.globalAlpha = 1;

      return c.toDataURL("image/png");
    },
    [frame, filter, sticker, caption, effectiveAuthorName]
  );

  // Compose 4-shot Photobooth Strip
  const composeStrip = useCallback(
    (currentShots: ImageData[]): string => {
      const pad = 28;
      const gap = 18;
      const footer = 110;
      const c = document.createElement("canvas");
      c.width = STRIP_W + pad * 2;
      c.height = pad + STRIP_SHOTS * STRIP_H + (STRIP_SHOTS - 1) * gap + footer;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = frame.bg;
      ctx.fillRect(0, 0, c.width, c.height);

      currentShots.forEach((s, i) => {
        const copy = new ImageData(new Uint8ClampedArray(s.data), s.width, s.height);
        applyFilter(copy.data, filter);
        ctx.putImageData(copy, pad, pad + i * (STRIP_H + gap));
      });

      ctx.fillStyle = frame.ink;
      ctx.globalAlpha = 0.9;
      if (sticker === "stars") {
        [[pad + 30, pad + 30, 14], [c.width - pad - 34, pad + STRIP_H + gap + 40, 10], [pad + 40, pad + 3 * (STRIP_H + gap) - 30, 12]].forEach(
          ([x, y, r]) => drawStar(ctx, x, y, r)
        );
      }
      if (sticker === "hearts") {
        [[c.width - pad - 40, pad + 20, 26], [pad + 34, pad + 2 * (STRIP_H + gap) + 16, 20]].forEach(
          ([x, y, s]) => drawHeart(ctx, x, y, s)
        );
      }
      if (sticker === "moon") {
        drawMoon(ctx, c.width - pad - 44, pad + 44, 22, frame.bg);
      }

      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
      const hand = css?.getPropertyValue("--font-caveat").trim() || "Caveat, cursive";
      const sans = css?.getPropertyValue("--font-dmsans").trim() || "DM Sans, sans-serif";
      ctx.font = `44px ${hand}`;
      ctx.fillText(caption || "our little universe", c.width / 2, c.height - footer / 2 + 6);
      ctx.font = `16px ${sans}`;
      ctx.globalAlpha = 0.6;
      ctx.fillText(
        `By ${effectiveAuthorName} • ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
        c.width / 2,
        c.height - 22
      );

      return c.toDataURL("image/png");
    },
    [frame, filter, sticker, caption, effectiveAuthorName]
  );

  // Trigger Shoot Action
  const shoot = async () => {
    setStrip(null);

    if (cameraMode === "polaroid") {
      // 1-Shot Polaroid Mode
      if (!instantSnap) {
        for (let n = 3; n > 0; n--) {
          setCount(n);
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      setCount(null);
      const img = grab(true);
      playShutterSound();
      setFlash(true);
      setTimeout(() => setFlash(false), 200);

      if (img) {
        setShots([img]);
        const polaroidDataUrl = composePolaroid(img);
        setStrip(polaroidDataUrl);
      }
    } else {
      // 4-Shot Strip Mode
      const taken: ImageData[] = [];
      for (let i = 0; i < STRIP_SHOTS; i++) {
        if (!instantSnap) {
          for (let n = 3; n > 0; n--) {
            setCount(n);
            await new Promise((r) => setTimeout(r, 800));
          }
        }
        setCount(null);
        const img = grab(false);
        playShutterSound();
        if (img) taken.push(img);
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
        setShots([...taken]);
        await new Promise((r) => setTimeout(r, 450));
      }
      if (taken.length === STRIP_SHOTS) {
        const stripDataUrl = composeStrip(taken);
        setStrip(stripDataUrl);
      }
    }
  };

  // Re-compose when filters or text change with an existing shot
  useEffect(() => {
    if (cameraMode === "polaroid" && shots.length >= 1) {
      setStrip(composePolaroid(shots[0]));
    } else if (cameraMode === "strip" && shots.length === STRIP_SHOTS) {
      setStrip(composeStrip(shots));
    }
  }, [cameraMode, shots, composePolaroid, composeStrip]);

  const download = () => {
    if (!strip) return;
    const a = document.createElement("a");
    a.href = strip;
    a.download = `${cameraMode === "polaroid" ? "polaroid" : "photobooth"}-${effectiveAuthorName.toLowerCase()}-${Date.now()}.png`;
    a.click();
  };

  const saveToGallery = async () => {
    if (!strip) return;
    setSaving(true);
    try {
      const blob = await (await fetch(strip)).blob();
      const path = await uploadMedia(blob, {
        mode,
        relationshipId: relationship?.id,
        folder: "photobooth"
      });

      const authorTag = `— ${effectiveAuthorName}`;
      const finalCaption = caption.trim()
        ? caption.includes("—")
          ? caption
          : `${caption} ${authorTag}`
        : `Our memory ${authorTag}`;

      await strips.add({
        image_path: path,
        caption: finalCaption,
        created_by: effectiveAuthorId
      });

      toast(`Polaroid saved to ${effectiveAuthorName}’s section! 💕`, "success");
      setShots([]);
      setStrip(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Group photos by author
  const getAuthorInfo = useCallback(
    (item: Strip) => {
      const authorId = (item.created_by ?? (item as unknown as { author_id?: string }).author_id ?? null) as string | null;
      const cap = item.caption?.toLowerCase() ?? "";

      let isSonuAuthor = false;
      let isYukkuAuthor = false;

      if (authorId) {
        if (sonuMember?.user_id && authorId === sonuMember.user_id) isSonuAuthor = true;
        else if (yukkuMember?.user_id && authorId === yukkuMember.user_id) isYukkuAuthor = true;
      }

      if (!isSonuAuthor && !isYukkuAuthor) {
        if (cap.includes("— sonu") || cap.includes("by sonu")) isSonuAuthor = true;
        else if (cap.includes("— yuk") || cap.includes("by yuk")) isYukkuAuthor = true;
        else {
          // Fallback based on logged in user
          if (authorId === userId) {
            if (isSonu) isSonuAuthor = true;
            else isYukkuAuthor = true;
          } else {
            if (isSonu) isYukkuAuthor = true;
            else isSonuAuthor = true;
          }
        }
      }

      const name = isSonuAuthor
        ? sonuMember?.display_name || "Sonu"
        : yukkuMember?.display_name || "Yukku";

      return {
        isSonu: isSonuAuthor,
        isYukku: isYukkuAuthor,
        name,
        avatarEmoji: isSonuAuthor ? "💌" : "🌸",
        tagColor: isSonuAuthor
          ? "bg-blush/20 text-blush border-blush/30"
          : "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
      };
    },
    [isSonu, sonuMember, yukkuMember, userId]
  );

  const sonuStrips = useMemo(() => strips.items.filter((item) => getAuthorInfo(item).isSonu), [strips.items, getAuthorInfo]);
  const yukkuStrips = useMemo(() => strips.items.filter((item) => getAuthorInfo(item).isYukku), [strips.items, getAuthorInfo]);

  const handleDeletePhoto = async (photo: Strip) => {
    if (!confirm("Are you sure you want to remove this Polaroid from your album?")) return;
    try {
      await strips.remove(photo.id);
      toast("Photo removed from album", "info");
      if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Photobooth & Polaroids"
        subtitle="Click instant Polaroid photos or 4-shot strips on your side. Photos develop and sync to each other’s section in real time."
      />

      {mode === "supabase" && relationship && <PhotoRotation key={relationship.id} relationshipId={relationship.id} />}

      {/* Main Camera & Developing Studio */}
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-midnight/70 border border-lilac/20 p-1.5 backdrop-blur">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setCameraMode("polaroid");
                  setShots([]);
                  setStrip(null);
                }}
                className={clsx(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition",
                  cameraMode === "polaroid"
                    ? "bg-gradient-to-r from-blush to-gold text-midnight shadow-glow"
                    : "text-lilac hover:bg-cloud/10 hover:text-cloud"
                )}
              >
                <Camera className="h-4 w-4" /> 📸 Polaroid Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraMode("strip");
                  setShots([]);
                  setStrip(null);
                }}
                className={clsx(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition",
                  cameraMode === "strip"
                    ? "bg-gradient-to-r from-blush to-gold text-midnight shadow-glow"
                    : "text-lilac hover:bg-cloud/10 hover:text-cloud"
                )}
              >
                <Layers className="h-4 w-4" /> 🎞️ 4-Shot Strip
              </button>
            </div>

            {/* Persona Switcher (For easy local & preview testing) */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-lilac/70 px-2 py-1 bg-midnight/80 rounded-xl border border-lilac/15">
              <span>Snapped as:</span>
              <button
                type="button"
                onClick={() => setSnappingAs("sonu")}
                className={clsx(
                  "rounded-lg px-2 py-0.5 font-bold transition",
                  effectiveAuthorName === (sonuMember?.display_name || "Sonu")
                    ? "bg-blush text-midnight"
                    : "text-lilac hover:text-cloud"
                )}
              >
                💌 Sonu
              </button>
              <button
                type="button"
                onClick={() => setSnappingAs("yukku")}
                className={clsx(
                  "rounded-lg px-2 py-0.5 font-bold transition",
                  effectiveAuthorName === (yukkuMember?.display_name || "Yukku")
                    ? "bg-emerald-400 text-midnight"
                    : "text-lilac hover:text-cloud"
                )}
              >
                🌸 Yukku
              </button>
            </div>
          </div>

          {/* Viewfinder Window */}
          <div className="relative overflow-hidden rounded-[28px] border-[10px] border-deep bg-midnight shadow-2xl">
            <div className={clsx("relative", cameraMode === "polaroid" ? "aspect-square max-h-[500px] mx-auto" : "aspect-[4/3]")}>
              {camera === "on" ? (
                <video
                  ref={video}
                  playsInline
                  muted
                  className={clsx(
                    "h-full w-full object-cover",
                    facingMode === "user" ? "-scale-x-100" : ""
                  )}
                  style={{ filter: FILTERS.find((f) => f.key === filter)!.css }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                  {camera === "denied" || camera === "unsupported" ? (
                    <CameraOff className="h-10 w-10 text-blush" />
                  ) : (
                    <Camera className="h-10 w-10 text-lilac" />
                  )}
                  <p className="max-w-xs text-sm text-lilac">
                    {camera === "denied"
                      ? "Camera access was blocked. Allow it in your browser’s site settings, then try again."
                      : camera === "unsupported"
                      ? "No camera was found, or this browser doesn’t allow camera access here (it needs HTTPS)."
                      : "The camera turns on only when you press the button."}
                  </p>
                  <Button onClick={() => void start()} loading={camera === "starting"}>
                    {camera === "off" || camera === "starting" ? "Turn on camera" : "Try again"}
                  </Button>
                </div>
              )}

              {/* Countdown Overlay */}
              <AnimatePresence>
                {count !== null && (
                  <motion.span
                    key={count}
                    initial={{ scale: 1.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center num font-display text-[120px] text-cream drop-shadow-2xl"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Flash effect */}
              {flash && <div className="absolute inset-0 bg-white" />}
            </div>
          </div>

          {/* Camera Shutter Bar */}
          {camera === "on" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-midnight/60 border border-lilac/20 p-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  onClick={shoot}
                  disabled={count !== null}
                  className="bg-gradient-to-r from-blush to-gold font-bold text-midnight shadow-glow hover:brightness-110"
                >
                  <Camera className="h-5 w-5" />
                  {cameraMode === "polaroid"
                    ? "Snap Polaroid 📸"
                    : shots.length
                    ? "Retake all four"
                    : "Take four photos 🎞️"}
                </Button>

                <button
                  type="button"
                  onClick={toggleFacing}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-cloud/10 text-cloud hover:bg-cloud/20 transition"
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-lilac cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={instantSnap}
                    onChange={(e) => setInstantSnap(e.target.checked)}
                    className="rounded border-lilac/30 text-blush focus:ring-blush bg-midnight/50"
                  />
                  <span>No timer (instant)</span>
                </label>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stop();
                    setCamera("off");
                  }}
                >
                  Turn off camera
                </Button>
              </div>
            </div>
          )}

          {/* Styling Options Panel */}
          <div className="glass space-y-4 rounded-[24px] p-5 border border-lilac/20 shadow-xl">
            {/* Filters */}
            <div>
              <p className="mb-2 text-xs uppercase font-bold tracking-wider text-lilac/80">Photo Filter</p>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={clsx(
                      "rounded-full px-3.5 py-1 text-xs font-medium transition",
                      filter === f.key ? "bg-cloud/20 text-cloud border border-cloud/40 shadow-sm" : "text-lilac hover:bg-cloud/5"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Colors */}
            <div>
              <p className="mb-2 text-xs uppercase font-bold tracking-wider text-lilac/80">Polaroid Paper Frame</p>
              <div className="flex gap-2.5 items-center">
                {FRAMES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFrame(f)}
                    className={clsx(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      frame.key === f.key ? "border-cloud scale-110 shadow-glow" : "border-transparent hover:scale-105"
                    )}
                    style={{ background: f.bg }}
                    title={f.label}
                  />
                ))}
                <span className="text-xs text-lilac/80 font-medium ml-1.5">{frame.label}</span>
              </div>
            </div>

            {/* Stickers */}
            <div>
              <p className="mb-2 text-xs uppercase font-bold tracking-wider text-lilac/80">Corner Stickers</p>
              <div className="flex flex-wrap gap-2">
                {STICKERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSticker(s)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs capitalize transition",
                      sticker === s ? "bg-cloud/20 text-cloud border border-cloud/40" : "text-lilac hover:bg-cloud/5"
                    )}
                  >
                    {s === "none" ? "None" : s === "stars" ? "⭐ Stars" : s === "hearts" ? "💕 Hearts" : "🌙 Moon"}
                  </button>
                ))}
              </div>
            </div>

            {/* Handwritten Caption */}
            <Field label="Handwritten Polaroid Caption">
              <Input
                value={caption}
                maxLength={45}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. My favourite smile in the universe..."
              />
            </Field>
          </div>
        </div>

        {/* Right Column: Developed Polaroid Preview */}
        <div className="flex flex-col items-center justify-start gap-4">
          {strip ? (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <div className="relative group max-w-sm rounded-[24px] p-2 bg-[#FAF8F5]/5 border border-lilac/25 shadow-2xl backdrop-blur">
                <motion.img
                  initial={{ filter: "brightness(0.5) blur(3px) sepia(0.5)", opacity: 0.8 }}
                  animate={{ filter: "brightness(1) blur(0px) sepia(0)", opacity: 1 }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                  src={strip}
                  alt="Your developed photo"
                  className="max-h-[75dvh] w-auto rounded-[18px] shadow-2xl mx-auto"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button
                  onClick={saveToGallery}
                  loading={saving}
                  className="bg-gradient-to-r from-blush to-gold text-midnight font-bold shadow-glow"
                >
                  <Save className="h-4 w-4" /> Save to our album 💌
                </Button>
                <Button variant="soft" onClick={download}>
                  <Download className="h-4 w-4" /> Download PNG
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShots([]);
                    setStrip(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Retake
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="flex h-full min-h-[380px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-lilac/25 p-8 text-center text-sm text-lilac bg-midnight/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cloud/5 border border-lilac/20 text-lilac/60 mb-3">
                <Camera className="h-8 w-8" />
              </div>
              <p className="font-display text-xl text-cloud">Your Polaroid develops here</p>
              <p className="text-xs text-lilac/70 max-w-xs mt-1">
                Snap a photo on the camera to develop an instant keepsake. Both of you can view and collect them in your shared album below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cross-Partner Shared Photo Album Sections */}
      <section className="mt-14 space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-lilac/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl sm:text-3xl text-cloud">Our Polaroid Album</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Synced
              </span>
            </div>
            <p className="text-sm text-lilac mt-1">
              Photos snapped on your phone appear in each other’s album in real time.
            </p>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-midnight/70 border border-lilac/20 p-1.5 text-xs backdrop-blur">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={clsx(
                "rounded-xl px-3 py-1.5 font-semibold transition",
                activeTab === "all" ? "bg-cloud/20 text-cloud border border-cloud/30" : "text-lilac hover:text-cloud"
              )}
            >
              ✨ All Moments ({strips.items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("yukku")}
              className={clsx(
                "rounded-xl px-3 py-1.5 font-semibold transition flex items-center gap-1.5",
                activeTab === "yukku" ? "bg-emerald-400/25 text-emerald-300 border border-emerald-400/40" : "text-lilac hover:text-cloud"
              )}
            >
              🌸 Yukku’s Section ({yukkuStrips.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sonu")}
              className={clsx(
                "rounded-xl px-3 py-1.5 font-semibold transition flex items-center gap-1.5",
                activeTab === "sonu" ? "bg-blush/25 text-blush border border-blush/40" : "text-lilac hover:text-cloud"
              )}
            >
              💌 Sonu’s Section ({sonuStrips.length})
            </button>
          </div>
        </div>

        {/* TAB 1: YUKKU'S SECTION */}
        {(activeTab === "yukku" || activeTab === "all") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-emerald-300 flex items-center gap-2">
                🌸 Yukku’s Polaroids
                <span className="text-xs font-mono text-lilac/70">({yukkuStrips.length} photos)</span>
              </h3>
              <p className="text-xs text-lilac/70">
                {isSonu ? "Photos Yukku clicked for you 💕" : "Photos you snapped for Sonu 📸"}
              </p>
            </div>

            {yukkuStrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-emerald-400/5 p-8 text-center text-sm text-lilac">
                <span className="text-2xl block mb-2">🌸</span>
                <p className="font-display text-lg text-cloud">Yukku hasn’t snapped any Polaroids yet.</p>
                <p className="text-xs text-lilac/70 mt-1">
                  Whenever she snaps a photo on her phone, it will instantly appear right here in real time!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {yukkuStrips.map((s, idx) => {
                  const author = getAuthorInfo(s);
                  return (
                    <PolaroidCard
                      key={s.id}
                      item={s}
                      author={author}
                      rotation={idx % 2 === 0 ? -1.5 : 1.5}
                      onExpand={() => setSelectedPhoto(s)}
                      onDelete={() => handleDeletePhoto(s)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SONU'S SECTION */}
        {(activeTab === "sonu" || activeTab === "all") && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-blush flex items-center gap-2">
                💌 Sonu’s Polaroids
                <span className="text-xs font-mono text-lilac/70">({sonuStrips.length} photos)</span>
              </h3>
              <p className="text-xs text-lilac/70">
                {isSonu ? "Photos you snapped for Yukku 📸" : "Photos Sonu clicked for you 💕"}
              </p>
            </div>

            {sonuStrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blush/20 bg-blush/5 p-8 text-center text-sm text-lilac">
                <span className="text-2xl block mb-2">💌</span>
                <p className="font-display text-lg text-cloud">Sonu hasn’t snapped any Polaroids yet.</p>
                <p className="text-xs text-lilac/70 mt-1">
                  Whenever he snaps a photo on his phone, it will instantly appear right here in real time!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sonuStrips.map((s, idx) => {
                  const author = getAuthorInfo(s);
                  return (
                    <PolaroidCard
                      key={s.id}
                      item={s}
                      author={author}
                      rotation={idx % 2 === 0 ? 1.5 : -1.5}
                      onExpand={() => setSelectedPhoto(s)}
                      onDelete={() => handleDeletePhoto(s)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <Modal
          open={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          title="Polaroid Keepsake"
        >
          <div className="space-y-4 text-center">
            <div className="overflow-hidden rounded-2xl bg-midnight/80 p-2 shadow-2xl">
              <MediaImage
                path={selectedPhoto.image_path}
                alt={selectedPhoto.caption ?? "Polaroid"}
                className="max-h-[70vh] w-auto mx-auto rounded-xl object-contain shadow-soft"
              />
            </div>

            <div className="space-y-1">
              <p className="font-hand text-2xl text-cream">
                {selectedPhoto.caption ?? "our little universe"}
              </p>
              <p className="text-xs text-lilac/70 font-sans">
                {new Date(selectedPhoto.created_at ?? Date.now()).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="soft"
                onClick={() => {
                  // Trigger download
                  const img = document.querySelector(".max-h-\\[70vh\\]") as HTMLImageElement;
                  if (img?.src) {
                    const a = document.createElement("a");
                    a.href = img.src;
                    a.download = `polaroid-${selectedPhoto.id}.png`;
                    a.click();
                  }
                }}
              >
                <Download className="h-4 w-4" /> Download Photo
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleDeletePhoto(selectedPhoto)}
                className="text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Individual Polaroid Card in Gallery
function PolaroidCard({
  item,
  author,
  rotation,
  onExpand,
  onDelete
}: {
  item: Strip;
  author: { isSonu: boolean; isYukku: boolean; name: string; avatarEmoji: string; tagColor: string };
  rotation: number;
  onExpand: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, rotate: 0, y: -4 }}
      style={{ rotate: `${rotation}deg` }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="group relative cursor-pointer overflow-hidden rounded-[20px] bg-[#FAF8F5] p-3 pb-5 text-midnight shadow-xl border border-white/60 transition-shadow duration-300 hover:shadow-2xl hover:z-10"
      onClick={onExpand}
    >
      {/* Photo Frame */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-midnight shadow-inner">
        <MediaImage
          path={item.image_path}
          alt={item.caption ?? "Polaroid"}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Hover overlay with action icons */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-midnight/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="rounded-full bg-white/90 p-2 text-midnight shadow-lg hover:bg-white hover:scale-110 transition"
            title="View Full Size"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-full bg-rose-500/90 p-2 text-white shadow-lg hover:bg-rose-600 hover:scale-110 transition"
            title="Delete Photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Area: Caption and Author */}
      <div className="mt-3 space-y-1 text-center">
        <p className="font-hand text-lg font-medium leading-snug text-[#2E243F] truncate px-1">
          {item.caption || "our little universe"}
        </p>

        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
              author.tagColor
            )}
          >
            <span>{author.avatarEmoji}</span>
            <span>{author.name}</span>
          </span>
          <span className="text-[10px] text-midnight/50 font-sans">
            {new Date(item.created_at ?? Date.now()).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short"
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
