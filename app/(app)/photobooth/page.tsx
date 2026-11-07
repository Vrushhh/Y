"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, Download, RotateCcw, Save } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { useCollection, type Row } from "@/lib/useCollection";
import { uploadMedia } from "@/lib/media";
import { applyFilter, FILTERS, type FilterName } from "@/lib/filters";
import { Button, Field, Input, PageHeader } from "@/components/ui";
import { MediaImage } from "@/components/MediaInputs";
import { PhotoRotation } from "./PhotoRotation";

const SHOTS = 4, W = 480, H = 360;
const FRAMES = [
  { key: "cream", label: "Cream", bg: "#F8E8D8", ink: "#40345C" },
  { key: "night", label: "Midnight", bg: "#211A36", ink: "#F4EAF5" },
  { key: "blush", label: "Blush", bg: "#E8B9D0", ink: "#40345C" },
  { key: "lilac", label: "Lilac", bg: "#C9BCE8", ink: "#211A36" }
];
const STICKERS = ["none", "stars", "hearts", "moon"] as const;
type Sticker = (typeof STICKERS)[number];
type Strip = Row & { image_path: string; caption?: string | null };

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2, rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
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
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export default function Photobooth() {
  const { mode, relationship, toast } = useApp();
  const strips = useCollection<Strip>("photo_strips", { order: "created_at", ascending: false });
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
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

  const stop = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);
  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (camera === "on" && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => undefined);
    }
  }, [camera]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamera("unsupported"); return; }
    setCamera("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      setCamera("on");
    } catch (e) {
      setCamera((e as DOMException).name === "NotAllowedError" ? "denied" : "unsupported");
    }
  };

  const grab = (): ImageData | null => {
    const v = video.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    const ratio = W / H, vr = v.videoWidth / v.videoHeight;
    const sw = vr > ratio ? v.videoHeight * ratio : v.videoWidth, sh = vr > ratio ? v.videoHeight : v.videoWidth / ratio;
    ctx.translate(W, 0); ctx.scale(-1, 1); // mirror, like a real booth
    ctx.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, W, H);
    return ctx.getImageData(0, 0, W, H);
  };

  const shoot = async () => {
    setStrip(null);
    const taken: ImageData[] = [];
    for (let i = 0; i < SHOTS; i++) {
      for (let n = 3; n > 0; n--) { setCount(n); await new Promise((r) => setTimeout(r, 800)); }
      setCount(null);
      const img = grab();
      if (img) taken.push(img);
      setFlash(true); setTimeout(() => setFlash(false), 180);
      setShots([...taken]);
      await new Promise((r) => setTimeout(r, 450));
    }
  };

  const compose = useCallback(() => {
    if (shots.length < SHOTS) return;
    const pad = 28, gap = 18, footer = 110;
    const c = document.createElement("canvas");
    c.width = W + pad * 2; c.height = pad + SHOTS * H + (SHOTS - 1) * gap + footer;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = frame.bg; ctx.fillRect(0, 0, c.width, c.height);
    shots.forEach((s, i) => {
      const copy = new ImageData(new Uint8ClampedArray(s.data), s.width, s.height);
      applyFilter(copy.data, filter);
      ctx.putImageData(copy, pad, pad + i * (H + gap));
    });
    ctx.fillStyle = frame.ink;
    ctx.globalAlpha = 0.9;
    if (sticker === "stars") [[pad + 30, pad + 30, 14], [c.width - pad - 34, pad + H + gap + 40, 10], [pad + 40, pad + 3 * (H + gap) - 30, 12]].forEach(([x, y, r]) => drawStar(ctx, x, y, r));
    if (sticker === "hearts") [[c.width - pad - 40, pad + 20, 26], [pad + 34, pad + 2 * (H + gap) + 16, 20]].forEach(([x, y, s]) => drawHeart(ctx, x, y, s));
    if (sticker === "moon") drawMoon(ctx, c.width - pad - 44, pad + 44, 22, frame.bg);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    const css = getComputedStyle(document.documentElement);
    const hand = css.getPropertyValue("--font-caveat").trim() || "cursive";
    const sans = css.getPropertyValue("--font-dmsans").trim() || "sans-serif";
    ctx.font = `44px ${hand}`;
    ctx.fillText(caption || "our little universe", c.width / 2, c.height - footer / 2 + 6);
    ctx.font = `16px ${sans}`;
    ctx.globalAlpha = 0.6;
    ctx.fillText(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), c.width / 2, c.height - 22);
    setStrip(c.toDataURL("image/png"));
  }, [shots, filter, frame, sticker, caption]);

  useEffect(() => { compose(); }, [compose]);

  const download = () => {
    if (!strip) return;
    const a = document.createElement("a");
    a.href = strip; a.download = `our-little-universe-${Date.now()}.png`; a.click();
  };

  const saveToGallery = async () => {
    if (!strip || !confirm("Save this strip to your shared gallery? Both of you will be able to see it.")) return;
    setSaving(true);
    try {
      const blob = await (await fetch(strip)).blob();
      const path = await uploadMedia(blob, { mode, relationshipId: relationship?.id, folder: "photobooth" });
      await strips.add({ image_path: path, caption: caption || null });
      toast("Saved to your gallery", "success");
    } catch (e) { toast((e as Error).message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Photobooth" subtitle="Four frames, a three-second countdown each. Nothing leaves this device unless you choose to save it." />
      {mode === "supabase" && relationship && <PhotoRotation key={relationship.id} relationshipId={relationship.id} />}
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[28px] border-[10px] border-deep bg-midnight shadow-soft">
            <div className="relative aspect-[4/3]">
              {camera === "on" ? (
                <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" style={{ filter: FILTERS.find((f) => f.key === filter)!.css }} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                  {camera === "denied" || camera === "unsupported" ? <CameraOff className="h-10 w-10 text-blush" /> : <Camera className="h-10 w-10 text-lilac" />}
                  <p className="max-w-xs text-sm text-lilac">
                    {camera === "denied" ? "Camera access was blocked. Allow it in your browser’s site settings, then try again."
                      : camera === "unsupported" ? "No camera was found, or this browser doesn’t allow camera access here (it needs HTTPS)."
                      : "The camera turns on only when you press the button."}
                  </p>
                  <Button onClick={start} loading={camera === "starting"}>{camera === "off" || camera === "starting" ? "Turn on camera" : "Try again"}</Button>
                </div>
              )}
              <AnimatePresence>
                {count !== null && (
                  <motion.span key={count} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center num font-display text-[120px] text-cream drop-shadow-lg">{count}</motion.span>
                )}
              </AnimatePresence>
              {flash && <div className="absolute inset-0 bg-white" />}
            </div>
          </div>
          {camera === "on" && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={shoot} disabled={count !== null}><Camera className="h-5 w-5" /> {shots.length ? "Retake all four" : "Take four photos"}</Button>
              <span className="text-sm text-lilac">{shots.length}/{SHOTS} taken</span>
              <Button variant="ghost" size="sm" onClick={() => { stop(); setCamera("off"); }}>Turn off camera</Button>
            </div>
          )}
          <div className="glass space-y-4 rounded-[22px] p-5">
            <div>
              <p className="mb-2 text-sm text-lilac">Filter</p>
              <div className="flex flex-wrap gap-2">{FILTERS.map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={clsx("rounded-full px-4 py-1.5 text-sm", filter === f.key ? "bg-cloud/15 text-cloud" : "text-lilac hover:bg-cloud/5")} aria-pressed={filter === f.key}>{f.label}</button>)}</div>
            </div>
            <div>
              <p className="mb-2 text-sm text-lilac">Frame</p>
              <div className="flex gap-2">{FRAMES.map((f) => <button key={f.key} onClick={() => setFrame(f)} className={clsx("h-9 w-9 rounded-full border-2", frame.key === f.key ? "border-cloud" : "border-transparent")} style={{ background: f.bg }} aria-label={`${f.label} frame`} aria-pressed={frame.key === f.key} />)}</div>
            </div>
            <div>
              <p className="mb-2 text-sm text-lilac">Stickers</p>
              <div className="flex flex-wrap gap-2">{STICKERS.map((s) => <button key={s} onClick={() => setSticker(s)} className={clsx("rounded-full px-4 py-1.5 text-sm capitalize", sticker === s ? "bg-cloud/15 text-cloud" : "text-lilac hover:bg-cloud/5")} aria-pressed={sticker === s}>{s}</button>)}</div>
            </div>
            <Field label="Caption"><Input value={caption} maxLength={40} onChange={(e) => setCaption(e.target.value)} placeholder="our little universe" /></Field>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {strip ? (
            <>
              <motion.img initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} src={strip} alt="Your photo strip" className="max-h-[80dvh] w-auto rounded-md shadow-soft" />
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={download}><Download className="h-4 w-4" /> Download PNG</Button>
                <Button variant="soft" onClick={saveToGallery} loading={saving}><Save className="h-4 w-4" /> Save to our gallery</Button>
                <Button variant="ghost" onClick={() => { setShots([]); setStrip(null); }}><RotateCcw className="h-4 w-4" /> Start over</Button>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-lilac/25 p-6 text-center text-sm text-lilac">
              Your strip develops here after four photos.
            </div>
          )}
        </div>
      </div>

      {strips.items.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-2xl">Our gallery</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {strips.items.map((s) => <MediaImage key={s.id} path={s.image_path} alt={s.caption ?? "Photo strip"} className="w-full rounded-md shadow-soft" />)}
          </div>
        </section>
      )}
    </div>
  );
}
