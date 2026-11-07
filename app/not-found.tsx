import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-5xl text-cloud">Lost in space</h1>
      <p className="text-sm text-lilac">This corner of the universe doesn’t exist.</p>
      <Link href="/universe" className="rounded-full bg-gradient-to-r from-blush to-lilac px-5 py-2.5 text-sm font-medium text-midnight">Back to our universe</Link>
    </main>
  );
}
