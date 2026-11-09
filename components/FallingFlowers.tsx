"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useApp } from "@/components/providers/AppProvider";

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  swaySpeed: number;
  swayAmplitude: number;
  swayPhase: number;
  rotation: number;
  rotationSpeed: number;
  flipAngle: number;
  flipSpeed: number;
  colorType: number; // 0: soft pink, 1: warm peach, 2: ivory white, 3: rose
  opacity: number;
}

const PALETTES = [
  // Soft Rose Pink
  { tip: "#FFF0F5", body: "#F4A6C5", base: "#E0749E", vein: "#C95583" },
  // Peach Apricot
  { tip: "#FFF7F0", body: "#F6BA9C", base: "#E88D65", vein: "#D06D42" },
  // Creamy Ivory White
  { tip: "#FFFFFF", body: "#FAF0E4", base: "#E8D8C3", vein: "#CEBCA3" },
  // Romantic Blush Rose
  { tip: "#FEEAF2", body: "#E88BAF", base: "#D05B85", vein: "#B23B65" }
];

export function FallingFlowers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { prefs } = useApp();
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const enabled = prefs.animation_enabled && !reduceMotion;

  useEffect(() => {
    if (!enabled || dismissed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener("resize", onResize);

    // Number of gently falling petals
    const count = Math.min(30, Math.max(9, Math.round(window.innerWidth / 45)));
    const petals: Petal[] = [];

    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        // Stagger evenly across the screen on initial load so they're already drifting
        y: Math.random() * height - height * 0.2,
        size: (Math.random() * 9 + 11) * dpr,
        // VERY SLOW, GENTLE SPEED: 0.35 to 0.75 pixels per frame
        speedY: (Math.random() * 0.4 + 0.35) * dpr,
        swaySpeed: Math.random() * 0.012 + 0.008,
        swayAmplitude: (Math.random() * 32 + 15) * dpr,
        swayPhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.015,
        flipAngle: Math.random() * Math.PI * 2,
        flipSpeed: Math.random() * 0.016 + 0.008,
        colorType: Math.floor(Math.random() * 4),
        opacity: Math.random() * 0.35 + 0.6
      });
    }

    /**
     * Draws an authentic organic flower petal:
     * Curved notch at the top, smooth bellied sides, delicate stem taper,
     * and a subtle translucent vein running down the centre.
     */
    const drawRealisticPetal = (
      x: number,
      y: number,
      size: number,
      pal: (typeof PALETTES)[0],
      angle: number,
      flipAngle: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // 3D flip effect: scales X from -1 to 1 based on cosine of flip angle
      ctx.scale(Math.cos(flipAngle), 1);

      const w = size * 0.72;
      const h = size * 1.05;

      ctx.beginPath();
      // Start at base of petal
      ctx.moveTo(0, h * 0.5);

      // Left curved belly
      ctx.bezierCurveTo(-w * 0.75, h * 0.35, -w * 0.95, -h * 0.1, -w * 0.55, -h * 0.45);

      // Top notch / soft cleft
      ctx.bezierCurveTo(-w * 0.25, -h * 0.55, 0, -h * 0.48, 0, -h * 0.44);
      ctx.bezierCurveTo(0, -h * 0.48, w * 0.25, -h * 0.55, w * 0.55, -h * 0.45);

      // Right curved belly
      ctx.bezierCurveTo(w * 0.95, -h * 0.1, w * 0.75, h * 0.35, 0, h * 0.5);

      // Petal watercolor gradient
      const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
      grad.addColorStop(0, pal.tip);
      grad.addColorStop(0.4, pal.body);
      grad.addColorStop(1, pal.base);

      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle translucent vein down the middle
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      ctx.quadraticCurveTo(w * 0.06, 0, 0, -h * 0.35);
      ctx.strokeStyle = pal.vein;
      ctx.lineWidth = 0.75 * dpr;
      ctx.globalAlpha = ctx.globalAlpha * 0.45;
      ctx.stroke();

      ctx.restore();
    };

    let frame = 0;
    let lastPaint = 0;
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (now - lastPaint < 32) return;
      const step = lastPaint ? Math.min((now - lastPaint) / (1000 / 60), 3) : 1;
      lastPaint = now;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.speedY * step;
        p.swayPhase += p.swaySpeed * step;
        p.rotation += p.rotationSpeed * step;
        p.flipAngle += p.flipSpeed * step;

        const currentX = p.x + Math.sin(p.swayPhase) * p.swayAmplitude;

        ctx.globalAlpha = p.opacity;
        const pal = PALETTES[p.colorType];

        drawRealisticPetal(currentX, p.y, p.size, pal, p.rotation, p.flipAngle);

        // Wrap around smoothly when falling below the bottom
        if (p.y > height + 40 * dpr) {
          p.y = -30 * dpr;
          p.x = Math.random() * width;
        }
      }

      ctx.globalAlpha = 1;
    };

    const syncVisibility = () => {
      cancelAnimationFrame(frame);
      lastPaint = 0;
      if (!document.hidden) frame = requestAnimationFrame(render);
    };
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", syncVisibility);
      cancelAnimationFrame(frame);
    };
  }, [enabled, dismissed]);

  if (!enabled) return null;

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="utility-dock-bottom fixed right-[4.5rem] z-30 flex items-center gap-1.5 rounded-full border border-blush/30 bg-midnight/70 px-3.5 py-1.5 text-xs font-semibold text-blush shadow-glow backdrop-blur-md hover:bg-midnight transition"
        aria-label="Replay falling flower petals"
      >
        <span>🌸</span> Shower flowers
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />

      {/* Floating Replay / Dismiss button */}
      <div className="pointer-events-auto utility-dock-bottom absolute right-[4.5rem] z-30 flex items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="flex items-center gap-1.5 rounded-full border border-blush/30 bg-midnight/80 px-3.5 py-1.5 text-xs font-medium text-cream shadow-glow backdrop-blur-md hover:bg-midnight transition"
          aria-label="Hide falling petals"
        >
          <span>🌸</span> Petals <X className="h-3 w-3 ml-1 text-lilac" />
        </button>
      </div>
    </div>
  );
}
