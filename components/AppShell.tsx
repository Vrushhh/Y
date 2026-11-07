"use client";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { Nav } from "@/components/Nav";
import { Starfield } from "@/components/Starfield";
import { StardustCursor } from "@/components/StardustCursor";
import { Onboarding } from "@/components/Onboarding";
import { Spinner } from "@/components/ui";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, mode, relationship, userId } = useApp();
  const path = usePathname();

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

      <AnimatePresence mode="wait">
        <motion.main
          key={path}
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:pl-28 lg:pt-12"
        >
          {body}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
