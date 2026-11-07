"use client";
import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";

type Star = { x: number; y: number; r: number; base: number; speed: number; phase: number; drift: number };

/** Full-screen twinkling sky. Static when reduced motion is requested or animations are off. */
export function Starfield({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { prefs } = useApp();

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !prefs.animation_enabled;
    let stars: Star[] = [];
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      const count = Math.round(((window.innerWidth * window.innerHeight) / 5200) * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: (Math.random() * 1.1 + 0.25) * dpr, base: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.8 + 0.2, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.04 * dpr
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const a = reduce ? s.base : s.base + Math.sin(t / 1000 * s.speed + s.phase) * 0.3;
        if (!reduce) { s.y += s.drift; if (s.y < 0) s.y = canvas.height; if (s.y > canvas.height) s.y = 0; }
        ctx.beginPath();
        ctx.fillStyle = `rgba(248, 232, 216, ${Math.max(0.05, Math.min(1, a))})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.1 * dpr && a > 0.7) {
          ctx.fillStyle = `rgba(232, 185, 208, ${a * 0.15})`;
          ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onResize = () => { resize(); if (reduce) draw(0); };
    resize();
    draw(0);
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [density, prefs.animation_enabled]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(141,120,181,0.28),transparent_55%),radial-gradient(ellipse_at_85%_80%,rgba(232,185,208,0.14),transparent_50%),linear-gradient(180deg,#211A36_0%,#1a1430_60%,#211A36_100%)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
