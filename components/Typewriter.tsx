"use client";
import { useEffect, useState } from "react";

export function Typewriter({ text, speed = 38, className, onDone }: { text: string; speed?: number; className?: string; onDone?: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(text.length); onDone?.(); return; }
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) { clearInterval(t); onDone?.(); }
    }, speed);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      {n < text.length && <span aria-hidden className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-blush" />}
    </p>
  );
}
