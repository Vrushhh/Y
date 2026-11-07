"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera, Clock3, Gamepad2, Home, Hourglass, Mail, MapPin, Music2, MoreHorizontal, Settings, Sparkles, Star, Stars, Target, X
} from "lucide-react";
import clsx from "clsx";

const PRIMARY = [
  { href: "/universe", label: "Home", icon: Home },
  { href: "/memories", label: "Constellation", icon: Stars },
  { href: "/date-mode", label: "Date Mode", icon: Gamepad2 },
  { href: "/letters", label: "Letters", icon: Mail }
];

export const MORE = [
  { href: "/timeline", label: "Timeline", icon: Clock3 },
  { href: "/reasons", label: "Reasons jar", icon: Sparkles },
  { href: "/photobooth", label: "Photobooth", icon: Camera },
  { href: "/soundtrack", label: "Soundtrack", icon: Music2 },
  { href: "/bucket-list", label: "Future together", icon: Target },
  { href: "/time-capsule", label: "Time capsule", icon: Hourglass },
  { href: "/secret", label: "Secret corner", icon: Star },
  { href: "/settings", label: "Settings", icon: Settings }
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function Nav() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const moreActive = MORE.some((m) => isActive(path, m.href));

  return (
    <>
      {/* Desktop: floating sidebar */}
      <nav aria-label="Main" className="glass fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 rounded-[24px] p-2 lg:flex">
        {[...PRIMARY, ...MORE].map(({ href, label, icon: Icon }) => (
          <Link
            key={href} href={href} aria-label={label}
            className={clsx(
              "group relative flex h-11 w-11 items-center justify-center rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70",
              isActive(path, href) ? "bg-gradient-to-br from-blush/90 to-lilac/90 text-midnight" : "text-lilac hover:bg-cloud/10 hover:text-cloud"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-xl bg-midnight/95 px-3 py-1.5 text-xs text-cloud opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Mobile: bottom bar */}
      <nav aria-label="Main" className="glass-strong fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex justify-around rounded-[22px] px-2 py-1.5 lg:hidden">
        {PRIMARY.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx("flex min-w-[60px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px]", isActive(path, href) ? "text-blush" : "text-lilac")}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className={clsx("flex min-w-[60px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px]", moreActive ? "text-blush" : "text-lilac")} aria-haspopup="dialog">
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-midnight/70 backdrop-blur-sm" onClick={() => setMore(false)} />
            <motion.div
              role="dialog" aria-label="More places"
              className="glass-strong absolute inset-x-0 bottom-0 rounded-t-[28px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 80 && setMore(false)}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-xl">More of our universe</span>
                <button onClick={() => setMore(false)} aria-label="Close" className="rounded-full p-1.5 text-lilac"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MORE.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={() => setMore(false)} className={clsx("flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-[11px]", isActive(path, href) ? "bg-cloud/10 text-blush" : "text-lilac")}>
                    <Icon className="h-6 w-6" />
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
