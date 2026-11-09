"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useApp } from "@/components/providers/AppProvider";
import { Nav } from "@/components/Nav";
import { Starfield } from "@/components/Starfield";
import { StardustCursor } from "@/components/StardustCursor";
import { Onboarding } from "@/components/Onboarding";
import { PhotoWallToggle } from "@/components/PhotoWallToggle";
import { Spinner } from "@/components/ui";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, mode, relationship, userId, prefs } = useApp();
  const path = usePathname();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = prefs.animation_enabled && !reduceMotion;

  let body: ReactNode = children;
  if (!ready) body = <Spinner label="Opening our universe" />;
  else if (mode === "supabase" && userId && !relationship) body = <Onboarding />;

  return (
    <div className="relative min-h-dvh overflow-x-hidden selection:bg-blush/30 selection:text-cream">
      <Starfield />
      <StardustCursor />

      {mode === "preview" && (
        <div className="relative z-30 border-b border-cream/15 bg-cream/10 px-4 py-2 text-center text-xs text-cream backdrop-blur">
          Preview mode: Supabase isn’t connected, so everything is saved only in this browser. Add keys in .env.local to activate full cloud sync.
        </div>
      )}

      <Nav />

      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pl-28 lg:pt-12">
        {ready && relationship && (
          <PhotoWallToggle
            key={`${userId}:${relationship.id}`}
            storageKey={`photo-wall:${userId}:${relationship.id}`}
            relationshipId={relationship.id}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={path}
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldAnimate ? { opacity: 0, y: -6 } : undefined}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
