"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useApp } from "@/components/providers/AppProvider";

type Star = { x: number; y: number; r: number; base: number; speed: number; phase: number; drift: number };
type ShootingStar = { x: number; y: number; len: number; speed: number; opacity: number; angle: number; active: boolean };

/** Full-screen twinkling sky with shooting stars and subtle parallax. */
export function Starfield({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { prefs } = useApp();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = reduceMotion || !prefs.animation_enabled;
    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      const count = Math.round(((window.innerWidth * window.innerHeight) / 5000) * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (Math.random() * 1.1 + 0.25) * dpr,
        base: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.8 + 0.2,
        phase: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.04 * dpr
      }));
    };

    const spawnShootingStar = () => {
      if (reduce || shooting.length > 2) return;
      const angle = Math.PI * 0.25 + (Math.random() - 0.5) * 0.2;
      shooting.push({
        x: Math.random() * canvas.width * 0.8,
        y: Math.random() * canvas.height * 0.4,
        len: (120 + Math.random() * 100) * dpr,
        speed: (9 + Math.random() * 7) * dpr,
        opacity: 1,
        angle,
        active: true
      });
    };

    let shootTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleShoot = () => {
      shootTimer = setTimeout(() => {
        spawnShootingStar();
        scheduleShoot();
      }, 12000 + Math.random() * 10000);
    };

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = ((e.clientX - window.innerWidth / 2) / window.innerWidth) * 15 * dpr;
      targetMouseY = ((e.clientY - window.innerHeight / 2) / window.innerHeight) * 15 * dpr;
    };

    let lastPaint = 0;
    const draw = (t: number) => {
      if (!reduce && t - lastPaint < 32) { raf = requestAnimationFrame(draw); return; }
      const step = lastPaint ? Math.min((t - lastPaint) / (1000 / 60), 3) : 1;
      lastPaint = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!reduce) {
        mouseX += (targetMouseX - mouseX) * 0.04 * step;
        mouseY += (targetMouseY - mouseY) * 0.04 * step;
      }

      for (const s of stars) {
        const a = reduce ? s.base : s.base + Math.sin((t / 1000) * s.speed + s.phase) * 0.3;
        if (!reduce) {
          s.y += s.drift * step;
          if (s.y < 0) s.y = canvas.height;
          if (s.y > canvas.height) s.y = 0;
        }

        const px = s.x - mouseX * (s.r / dpr);
        const py = s.y - mouseY * (s.r / dpr);

        ctx.beginPath();
        ctx.fillStyle = `rgba(248, 232, 216, ${Math.max(0.05, Math.min(1, a))})`;
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (s.r > 1.1 * dpr && a > 0.7) {
          ctx.fillStyle = `rgba(232, 185, 208, ${a * 0.16})`;
          ctx.arc(px, py, s.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw shooting stars
      if (!reduce && shooting.length > 0) {
        for (let i = shooting.length - 1; i >= 0; i--) {
          const ss = shooting[i];
          const tailX = ss.x - Math.cos(ss.angle) * ss.len;
          const tailY = ss.y - Math.sin(ss.angle) * ss.len;

          const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
          grad.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity * 0.95})`);
          grad.addColorStop(0.3, `rgba(232, 185, 208, ${ss.opacity * 0.6})`);
          grad.addColorStop(1, `rgba(141, 120, 181, 0)`);

          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8 * dpr;
          ctx.lineCap = "round";
          ctx.moveTo(ss.x, ss.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          ss.x += Math.cos(ss.angle) * ss.speed * step;
          ss.y += Math.sin(ss.angle) * ss.speed * step;
          ss.opacity -= 0.015 * step;

          if (ss.opacity <= 0 || ss.x > canvas.width || ss.y > canvas.height) {
            shooting.splice(i, 1);
          }
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      if (reduce) draw(0);
    };

    const syncVisibility = () => {
      cancelAnimationFrame(raf);
      clearTimeout(shootTimer);
      lastPaint = 0;
      if (!reduce && !document.hidden) {
        raf = requestAnimationFrame(draw);
        scheduleShoot();
      }
    };

    resize();
    if (reduce) draw(0);
    else {
      document.addEventListener("visibilitychange", syncVisibility);
      syncVisibility();
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(shootTimer);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [density, prefs.animation_enabled, reduceMotion]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(141,120,181,0.28),transparent_55%),radial-gradient(ellipse_at_85%_80%,rgba(232,185,208,0.16),transparent_50%),linear-gradient(180deg,#211A36_0%,#18122a_60%,#211A36_100%)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
