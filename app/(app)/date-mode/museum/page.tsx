"use client";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { VirtualMuseum } from "@/components/museum/VirtualMuseum";
import { Spinner } from "@/components/ui";

export default function MuseumPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/date-mode"
          className="inline-flex items-center gap-2 text-sm text-lilac hover:text-cloud transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Date Mode
        </Link>
      </div>

      <Suspense fallback={<Spinner label="Opening museum doors" />}>
        <VirtualMuseum />
      </Suspense>
    </div>
  );
}

