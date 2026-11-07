"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

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
  colorType: number; // 0: pink, 1: peach, 2: cream, 3: deep rose
  isFullRose: boolean;
  opacity: number;
}

const PALETTES = [
  // 0: Blush Pink
  { primary: "#E8A4C2", secondary: "#D77A9E", highlight: "#FFF0F5", shadow: "#BA537B" },
  // 1: Warm Peach / Apricot
  { primary: "#EBA584", secondary: "#DE855C", highlight: "#FFF5ED", shadow: "#C6673B" },
  // 2: Creamy Ivory White
  { primary: "#FDF8F0", secondary: "#EFE3D3", highlight: "#FFFFFF", shadow: "#D8C5AD" },
  // 3: Romantic Dusty Rose
  { primary: "#D9769B", secondary: "#B84F77", highlight: "#FEEAF2", shadow: "#943158" }
];

// Top canopy decorative roses cluster
const CANOPY_ROSES = [
  { cx: "4%", cy: 30, r: 38, color: "#E8A4C2", inner: "#BA537B", rot: 12 },
  { cx: "11%", cy: 50, r: 46, color: "#FDF8F0", inner: "#D8C5AD", rot: -8 },
  { cx: "18%", cy: 25, r: 42, color: "#EBA584", inner: "#C6673B", rot: 25 },
  { cx: "25%", cy: 55, r: 48, color: "#D9769B", inner: "#943158", rot: -15 },
  { cx: "32%", cy: 35, r: 40, color: "#FDF8F0", inner: "#D8C5AD", rot: 10 },
  { cx: "39%", cy: 60, r: 50, color: "#E8A4C2", inner: "#BA537B", rot: -20 },
  { cx: "46%", cy: 30, r: 44, color: "#EBA584", inner: "#C6673B", rot: 18 },
  { cx: "53%", cy: 55, r: 46, color: "#FDF8F0", inner: "#D8C5AD", rot: -12 },
  { cx: "60%", cy: 35, r: 42, color: "#D9769B", inner: "#943158", rot: 22 },
  { cx: "67%", cy: 58, r: 48, color: "#E8A4C2", inner: "#BA537B", rot: -18 },
  { cx: "74%", cy: 30, r: 40, color: "#EBA584", inner: "#C6673B", rot: 14 },
  { cx: "81%", cy: 52, r: 46, color: "#FDF8F0", inner: "#D8C5AD", rot: -10 },
  { cx: "88%", cy: 28, r: 42, color: "#D9769B", inner: "#943158", rot: 20 },
  { cx: "95%", cy: 48, r: 44, color: "#E8A4C2", inner: "#BA537B", rot: -14 },
  // Second cascading drip layer
  { cx: "8%", cy: 90, r: 34, color: "#EBA584", inner: "#C6673B", rot: -5 },
  { cx: "22%", cy: 95, r: 36, color: "#FDF8F0", inner: "#D8C5AD", rot: 15 },
  { cx: "36%", cy: 100, r: 38, color: "#E8A4C2", inner: "#BA537B", rot: -25 },
  { cx: "50%", cy: 92, r: 35, color: "#D9769B", inner: "#943158", rot: 8 },
  { cx: "64%", cy: 102, r: 38, color: "#FDF8F0", inner: "#D8C5AD", rot: -12 },
  { cx: "78%", cy: 88, r: 34, color: "#EBA584", inner: "#C6673B", rot: 18 },
  { cx: "92%", cy: 94, r: 36, color: "#E8A4C2", inner: "#BA537B", rot: -10 }
];

export function FallingFlowers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const rafId = useRef<number>(0);

  useEffect(() => {
    // Only auto-play if not dismissed this session
    try {
      const seen = sessionStorage.getItem("olu:flowers-seen");
      if (!seen) {
        sessionStorage.setItem("olu:flowers-seen", "1");
      }
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    if (!active || dismissed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener("resize", onResize);

    // Generate falling flowers and individual petals
    const count = Math.min(50, Math.round(window.innerWidth / 28));
    const petals: Petal[] = [];

    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: -Math.random() * height * 0.9 - 40 * dpr, // staggered start above screen
        size: (Math.random() * 16 + 12) * dpr,
        speedY: (Math.random() * 1.8 + 1.2) * dpr,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayAmplitude: (Math.random() * 45 + 20) * dpr,
        swayPhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        flipAngle: Math.random() * Math.PI * 2,
        flipSpeed: Math.random() * 0.03 + 0.015,
        colorType: Math.floor(Math.random() * 4),
        isFullRose: Math.random() < 0.32, // ~32% are full blooming roses
        opacity: Math.random() * 0.35 + 0.65
      });
    }

    // Function to draw a detailed blooming watercolor rose
    const drawRose = (
      x: number,
      y: number,
      radius: number,
      pal: (typeof PALETTES)[0],
      angle: number,
      flip: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(Math.cos(flip), 1);

      // Outer petals
      const outerPetals = 5;
      for (let i = 0; i < outerPetals; i++) {
        const petAngle = (i * Math.PI * 2) / outerPetals;
        const px = Math.cos(petAngle) * (radius * 0.45);
        const py = Math.sin(petAngle) * (radius * 0.45);

        ctx.beginPath();
        ctx.arc(px, py, radius * 0.55, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(px, py, radius * 0.1, px, py, radius * 0.55);
        grad.addColorStop(0, pal.highlight);
        grad.addColorStop(0.55, pal.primary);
        grad.addColorStop(1, pal.secondary);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Middle petals
      const midPetals = 4;
      for (let i = 0; i < midPetals; i++) {
        const petAngle = (i * Math.PI * 2) / midPetals + 0.4;
        const px = Math.cos(petAngle) * (radius * 0.28);
        const py = Math.sin(petAngle) * (radius * 0.28);

        ctx.beginPath();
        ctx.arc(px, py, radius * 0.42, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(px, py, radius * 0.05, px, py, radius * 0.42);
        grad.addColorStop(0, pal.highlight);
        grad.addColorStop(0.7, pal.primary);
        grad.addColorStop(1, pal.shadow);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Rose bud centre spiral
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
      const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.22);
      centerGrad.addColorStop(0, pal.highlight);
      centerGrad.addColorStop(0.6, pal.secondary);
      centerGrad.addColorStop(1, pal.shadow);
      ctx.fillStyle = centerGrad;
      ctx.fill();

      // Soft center spiral line
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 1.5);
      ctx.strokeStyle = pal.shadow;
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      ctx.restore();
    };

    // Function to draw an organic curled single petal
    const drawPetal = (
      x: number,
      y: number,
      size: number,
      pal: (typeof PALETTES)[0],
      angle: number,
      flip: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(Math.cos(flip), 1);

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8);
      ctx.bezierCurveTo(size * 0.65, -size * 0.7, size * 0.75, size * 0.3, 0, size * 0.85);
      ctx.bezierCurveTo(-size * 0.75, size * 0.3, -size * 0.65, -size * 0.7, 0, -size * 0.8);

      const grad = ctx.createLinearGradient(0, -size * 0.8, 0, size * 0.85);
      grad.addColorStop(0, pal.highlight);
      grad.addColorStop(0.5, pal.primary);
      grad.addColorStop(1, pal.secondary);

      ctx.fillStyle = grad;
      ctx.fill();

      // Soft delicate vein
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.quadraticCurveTo(size * 0.08, 0, 0, size * 0.75);
      ctx.strokeStyle = pal.shadow;
      ctx.lineWidth = 0.8 * dpr;
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.speedY;
        p.swayPhase += p.swaySpeed;
        p.rotation += p.rotationSpeed;
        p.flipAngle += p.flipSpeed;

        const currentX = p.x + Math.sin(p.swayPhase) * p.swayAmplitude;

        ctx.globalAlpha = p.opacity;
        const pal = PALETTES[p.colorType];

        if (p.isFullRose) {
          drawRose(currentX, p.y, p.size, pal, p.rotation, p.flipAngle);
        } else {
          drawPetal(currentX, p.y, p.size, pal, p.rotation, p.flipAngle);
        }

        // Wrap around when past bottom of screen
        if (p.y > height + 60 * dpr) {
          p.y = -60 * dpr;
          p.x = Math.random() * width;
        }
      }

      ctx.globalAlpha = 1;
      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId.current);
    };
  }, [active, dismissed]);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full border border-blush/30 bg-midnight/70 px-3.5 py-1.5 text-xs font-semibold text-blush shadow-glow backdrop-blur-md hover:bg-midnight transition"
        aria-label="Replay flower shower"
      >
        <span>🌸</span> Shower flowers
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* 60fps Canvas for Falling Roses & Tumbling Petals */}
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Top Watercolor Rose Canopy (Matching love-flower aesthetic) */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="pointer-events-none absolute left-0 right-0 top-0 h-36 sm:h-44 overflow-hidden"
      >
        <svg
          viewBox="0 0 1200 160"
          preserveAspectRatio="none"
          className="h-full w-full drop-shadow-[0_12px_24px_rgba(232,164,194,0.35)]"
        >
          <defs>
            {CANOPY_ROSES.map((rose, idx) => (
              <radialGradient key={idx} id={`canopy-grad-${idx}`} cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="45%" stopColor={rose.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={rose.inner} stopOpacity="0.85" />
              </radialGradient>
            ))}
          </defs>

          {CANOPY_ROSES.map((rose, idx) => (
            <g
              key={idx}
              transform={`translate(${typeof rose.cx === "string" ? (parseFloat(rose.cx) / 100) * 1200 : rose.cx}, ${rose.cy}) rotate(${rose.rot})`}
            >
              {/* Petal layers */}
              <circle cx="0" cy="0" r={rose.r} fill={`url(#canopy-grad-${idx})`} />
              <circle cx="-3" cy="-2" r={rose.r * 0.7} fill={`url(#canopy-grad-${idx})`} opacity="0.9" />
              <circle cx="2" cy="3" r={rose.r * 0.45} fill={rose.inner} opacity="0.75" />
              <path
                d={`M -${rose.r * 0.2} 0 Q 0 -${rose.r * 0.25} ${rose.r * 0.2} 0 Q 0 ${rose.r * 0.25} -${rose.r * 0.2} 0`}
                fill="#FFF0F5"
                opacity="0.85"
              />
            </g>
          ))}
        </svg>

        {/* Soft atmospheric gradient glow blending into the midnight sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#E8A4C2]/20 via-[#EBA584]/10 to-transparent blur-xl" />
      </motion.div>

      {/* Floating Dismiss / Replay Control */}
      <div className="pointer-events-auto absolute bottom-5 right-5 z-40 flex items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="flex items-center gap-1.5 rounded-full border border-blush/30 bg-midnight/80 px-3.5 py-1.5 text-xs font-medium text-cream shadow-glow backdrop-blur-md hover:bg-midnight transition"
          aria-label="Hide flowers"
        >
          <span>🌸</span> Flowers <X className="h-3 w-3 ml-1 text-lilac" />
        </button>
      </div>
    </div>
  );
}
