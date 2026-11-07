"use client";
import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl text-cloud">A star fell out of place</h1>
      <p className="max-w-md text-sm text-lilac">{error.message || "Something went wrong while loading this page."}</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
