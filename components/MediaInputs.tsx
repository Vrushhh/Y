"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Square, Trash2, Upload } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { Button, IconButton } from "@/components/ui";

export function MediaImage({ path, alt, className }: { path?: string | null; alt: string; className?: string }) {
  const url = useMediaUrl(path);
  if (!path) return null;
  if (!url) return <div className={`animate-pulse bg-deep/60 ${className ?? ""}`} aria-label="Loading image" />;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

export function MediaAudio({ path }: { path?: string | null }) {
  const url = useMediaUrl(path);
  if (!path || !url) return null;
  return <audio controls src={url} className="w-full" preload="none" />;
}

/** Picks one or more images and uploads them. Returns stored paths. */
export function ImagePicker({ value, onChange, multiple, folder, label = "Add photo" }: {
  value: string[]; onChange: (paths: string[]) => void; multiple?: boolean; folder?: string; label?: string;
}) {
  const { mode, relationship, toast } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) { toast(`${f.name} isn’t an image`, "error"); continue; }
        paths.push(await uploadMedia(f, { mode, relationshipId: relationship?.id, folder }));
      }
      onChange(multiple ? [...value, ...paths] : paths.slice(0, 1));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p) => (
            <div key={p} className="relative">
              <MediaImage path={p} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button type="button" onClick={() => onChange(value.filter((x) => x !== p))} className="absolute -right-2 -top-2 rounded-full bg-midnight p-1 text-blush" aria-label="Remove photo">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => pick(e.target.files)} />
      <Button type="button" variant="soft" size="sm" onClick={() => input.current?.click()} loading={busy}>
        <ImagePlus className="h-4 w-4" /> {label}
      </Button>
    </div>
  );
}

/** Records a voice note with the microphone, or attaches an audio file. */
export function VoiceInput({ value, onChange }: { value: string | null; onChange: (path: string | null) => void }) {
  const { mode, relationship, toast } = useApp();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const save = async (blob: Blob) => {
    setBusy(true);
    try { onChange(await uploadMedia(blob, { mode, relationshipId: relationship?.id, folder: "voice" })); }
    catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(false); }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast("This browser can’t record audio. Attach a file instead.", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); save(new Blob(chunks.current, { type: r.mimeType || "audio/webm" })); };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      toast("Microphone access was blocked. Allow it in your browser settings to record.", "error");
    }
  };
  const stop = () => { rec.current?.stop(); setRecording(false); };

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2">
          <MediaAudio path={value} />
          <IconButton label="Remove voice note" type="button" onClick={() => onChange(null)}><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {recording ? (
          <Button type="button" variant="danger" size="sm" onClick={stop}><Square className="h-4 w-4" /> Stop recording</Button>
        ) : (
          <Button type="button" variant="soft" size="sm" onClick={start} loading={busy}><Mic className="h-4 w-4" /> Record voice note</Button>
        )}
        <input ref={file} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && save(e.target.files[0])} />
        <Button type="button" variant="ghost" size="sm" onClick={() => file.current?.click()}><Upload className="h-4 w-4" /> Attach audio</Button>
      </div>
    </div>
  );
}
