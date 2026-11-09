"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { Nav } from "@/components/Nav";
import { Starfield } from "@/components/Starfield";
import { StardustCursor } from "@/components/StardustCursor";
import { Onboarding } from "@/components/Onboarding";
import { Spinner } from "@/components/ui";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, mode, relationship, userId, prefs } = useApp();
  const path = usePathname();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(path);

  useEffect(() => {
    const changed = previousPath.current !== path;
    previousPath.current = path;
    if (!changed || !prefs.animation_enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const entrance = main.current?.animate([{ opacity: 0.86 }, { opacity: 1 }], {
      duration: 180,
      easing: "ease-out"
    });
    return () => entrance?.cancel();
  }, [path, prefs.animation_enabled]);

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

      <main ref={main} className="mx-auto w-full max-w-6xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pl-28 lg:pt-12">
        {body}
      </main>
    </div>
  );
}
