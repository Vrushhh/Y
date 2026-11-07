"use client";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import clsx from "clsx";

/** A paper envelope with a wax seal. `open` lifts the flap. */
export function Envelope({ open, glow, size = "lg", label, tint = "blush" }: { open?: boolean; glow?: boolean; size?: "sm" | "lg"; label?: string; tint?: "blush" | "lilac" | "cream" }) {
  const dims = size === "lg" ? "h-44 w-72 sm:h-52 sm:w-80" : "h-28 w-44";
  const body = tint === "lilac" ? "from-lilac to-lavender" : tint === "cream" ? "from-cream to-[#e9cdb6]" : "from-cream to-blush";
  return (
    <div className={clsx("relative", dims)} style={{ perspective: 900 }}>
      {glow && <div className="absolute -inset-10 rounded-full bg-blush/25 blur-3xl animate-glow" aria-hidden />}
      <div className={clsx("absolute inset-0 rounded-[14px] bg-gradient-to-br shadow-soft", body)} />
      {/* inner pocket edges */}
      <div className="absolute inset-0 overflow-hidden rounded-[14px]">
        <div className="absolute bottom-0 left-0 h-full w-1/2 origin-bottom-left bg-black/[0.04]" style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }} />
        <div className="absolute bottom-0 right-0 h-full w-1/2 bg-black/[0.06]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
      </div>
      <motion.div
        className={clsx("absolute inset-x-0 top-0 h-[58%] origin-top bg-gradient-to-b", body)}
        style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", transformStyle: "preserve-3d", filter: "brightness(0.96)" }}
        animate={{ rotateX: open ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.div
        className={clsx("absolute left-1/2 top-[52%] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-[#b56a8e] to-[#7e4a75] text-cream shadow-lg", size === "lg" ? "h-12 w-12" : "h-8 w-8")}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.6 : 1 }}
      >
        <Heart className={size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"} fill="currentColor" />
      </motion.div>
      {label && <span className="absolute inset-x-0 bottom-3 text-center font-hand text-lg text-midnight/70">{label}</span>}
    </div>
  );
}
