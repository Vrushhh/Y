"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useApp } from "@/components/providers/AppProvider";

type Sparkle = {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
};

const SPARKLE_COLORS = ["#E8B9D0", "#F8E8D8", "#C9BCE8", "#FCD34D", "#70C1B3"];

export function StardustCursor() {
  const { prefs } = useApp();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isPointerDevice, setIsPointerDevice] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);

  // Smooth fluid spring trailing for the starlight glow aura
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  useEffect(() => {
    setMounted(true);
    // Check if device has fine pointer (mouse/trackpad) and not reduced motion
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsPointerDevice(finePointer && !reduceMotion && prefs.animation_enabled);

    const handleMouseMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    const handleClick = (e: MouseEvent) => {
      if (!prefs.animation_enabled) return;
      // Spawn 4-5 micro sparkles around the click point
      const count = 4;
      const newSparkles: Sparkle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 20;
        newSparkles.push({
          id: Date.now() + Math.random(),
          x: e.clientX + Math.cos(angle) * dist,
          y: e.clientY + Math.sin(angle) * dist,
          size: Math.random() * 3 + 2,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
        });
      }

      setSparkles((prev) => [...prev.slice(-15), ...newSparkles]);
      setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => !newSparkles.some((ns) => ns.id === s.id)));
      }, 700);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("click", handleClick, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("click", handleClick);
    };
  }, [rawX, rawY, visible, prefs.animation_enabled]);

  if (!mounted || !isPointerDevice) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {/* Ethereal Starlight Cursor Glow */}
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%"
        }}
        animate={{
          opacity: visible ? 0.75 : 0,
          scale: visible ? 1 : 0.4
        }}
        transition={{ duration: 0.25 }}
        className="h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(232,185,208,0.14)_0%,rgba(141,120,181,0.06)_40%,transparent_70%)] blur-md"
      />

      {/* Tiny Core Star Pointer Sparkle */}
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%"
        }}
        animate={{
          opacity: visible ? 0.6 : 0
        }}
        className="h-1.5 w-1.5 rounded-full bg-[#FFF8F0] shadow-[0_0_8px_rgba(232,185,208,0.9)]"
      />

      {/* Click Micro-Sparkle Particles */}
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 1, scale: 0.3, x: s.x, y: s.y }}
          animate={{ opacity: 0, scale: 1.4, y: s.y - 12 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            backgroundColor: s.color,
            boxShadow: `0 0 6px ${s.color}`
          }}
        />
      ))}
    </div>
  );
}

