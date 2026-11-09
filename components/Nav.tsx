"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera, Clock3, Gamepad2, Home, Hourglass, Mail, Music2, MoreHorizontal, Settings, Sparkles, Star, Stars, Target, X
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
  { href: "/reasons", label: "Jars of reasons", icon: Sparkles },
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

  useEffect(() => {
    if (!more) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMore(false);
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [more]);

  return (
    <>
      {/* Desktop: floating sidebar with fluid sliding layout pill */}
      <nav aria-label="Main" className="glass fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1.5 rounded-[26px] p-2 lg:flex shadow-2xl border border-lilac/20">
        {[...PRIMARY, ...MORE].map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-11 w-11 items-center justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blush/70"
            >
              {/* Sliding glowing liquid active indicator */}
              {active && (
                <motion.div
                  layoutId="desktopActiveNav"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blush to-lilac shadow-glow"
                />
              )}

              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.92 }}
                className={clsx(
                  "relative z-10 flex items-center justify-center transition-colors duration-200",
                  active ? "text-midnight font-bold" : "text-lilac group-hover:text-cloud"
                )}
              >
                <Icon className="h-[19px] w-[19px]" />
              </motion.div>

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-xl bg-midnight/95 px-3 py-1.5 text-xs text-cloud opacity-0 shadow-soft transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1 group-focus-visible:opacity-100 border border-lilac/15">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile: bottom floating dock with fluid sliding pill */}
      <nav aria-label="Main" className="glass-strong fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[24px] px-1.5 py-1.5 lg:hidden shadow-2xl border border-lilac/25">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-2xl px-0.5 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-blush" : "text-lilac/90"
              )}
            >
              {active && (
                <motion.div
                  layoutId="mobileActiveNav"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-2xl bg-cloud/10 border border-blush/25"
                />
              )}
              <motion.div whileTap={{ scale: 0.94 }} className="relative z-10 flex flex-col items-center whitespace-nowrap">
                <Icon className="h-5 w-5" />
                {href === "/memories" ? <><span className="min-[380px]:hidden">Sky</span><span className="hidden min-[380px]:inline">Constellation</span></> : <span>{label}</span>}
              </motion.div>
            </Link>
          );
        })}

        <button
          onClick={() => setMore(true)}
          className={clsx(
            "relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-2xl px-0.5 py-1.5 text-[11px] font-medium transition-colors",
            moreActive ? "text-blush" : "text-lilac/90"
          )}
          aria-haspopup="dialog"
          aria-expanded={more}
        >
          {moreActive && (
            <motion.div
              layoutId="mobileActiveNav"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute inset-0 rounded-2xl bg-cloud/10 border border-blush/25"
            />
          )}
          <motion.div whileTap={{ scale: 0.94 }} className="relative z-10 flex flex-col items-center whitespace-nowrap">
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </motion.div>
        </button>
      </nav>

      {/* Mobile More Sheet */}
      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-midnight/75" onClick={() => setMore(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More places"
              className="glass-strong absolute inset-x-0 bottom-0 rounded-t-[28px] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-lilac/25"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 80 && setMore(false)}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-lilac/30" />
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-2xl text-cloud">More of our universe</span>
                <button onClick={() => setMore(false)} aria-label="Close" className="rounded-full p-2 text-lilac hover:bg-cloud/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {MORE.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMore(false)}
                    className={clsx(
                      "flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center text-[11px] font-medium transition active:scale-95",
                      isActive(path, href) ? "bg-cloud/15 text-blush border border-blush/30" : "text-lilac hover:bg-cloud/5"
                    )}
                  >
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
