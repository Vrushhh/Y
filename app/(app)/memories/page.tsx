"use client";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Compass, Crosshair, Edit3, MapPin, Pencil, Plus,
  Sparkles, Stars, Trash2, X
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { authorOf, useCollection, type Row } from "@/lib/useCollection";
import {
  Button, DemoBadge, ErrorNote, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, TextArea
} from "@/components/ui";
import { ImagePicker, MediaImage } from "@/components/MediaInputs";
import { formatDate } from "@/lib/time";
import type {
  ConstellationConfig, ConstellationStar
} from "@/components/ConstellationView";

const ConstellationView = dynamic(() => import("@/components/ConstellationView"), {
  ssr: false,
  loading: () => <Spinner label="Illuminating the night sky" />
});

const CATEGORIES: Record<string, string> = {
  first_meeting: "First meeting",
  first_date: "First date",
  favourite_place: "Favourite place",
  trip: "Trip",
  special_occasion: "Special occasion",
  future_destination: "Future destination"
};

type Memory = Row & {
  title: string;
  description?: string | null;
  location_name?: string | null;
  latitude: number;
  longitude: number;
  memory_date?: string | null;
  image_paths: string[];
  category: string;
  notes?: string | null;
};

const blank = {
  title: "",
  description: "",
  location_name: "",
  latitude: "",
  longitude: "",
  memory_date: "",
  category: "favourite_place",
  notes: "",
  image_paths: [] as string[]
};

function MemoriesInner() {
  const { nameOf, unlock, unlocks, toast, relationship } = useApp();
  const params = useSearchParams();
  const { items, loading, add, update, remove } = useCollection<Memory>("memories", { order: "memory_date" });

  const [layer, setLayer] = useState<"all" | "memories" | "future">("all");
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [counterTaps, setCounterTaps] = useState(0);
  const counterTapsRef = useRef(0);

  // Constellation custom naming and lines configuration
  const storageKey = `olu:constellation:${relationship?.id ?? "preview"}`;
  const [constellationConfig, setConstellationConfig] = useState<ConstellationConfig>({
    name: "Our Constellation",
    edges: []
  });
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Load saved constellation from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setConstellationConfig(JSON.parse(saved));
      }
    } catch {}
  }, [storageKey]);

  const handleUpdateConstellation = (next: ConstellationConfig) => {
    setConstellationConfig(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    if (params.get("add")) startAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = items.filter(
    (m) => layer === "all" || (layer === "future" ? m.category === "future_destination" : m.category !== "future_destination")
  );

  const constellationStars: ConstellationStar[] = useMemo(
    () =>
      visible.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        memory_date: m.memory_date,
        location_name: m.location_name,
        image_paths: m.image_paths ?? [],
        lat: m.latitude,
        lng: m.longitude,
        future: m.category === "future_destination",
        is_demo: m.is_demo
      })),
    [visible]
  );

  const selected = items.find((m) => m.id === active) ?? null;
  const pastCount = items.filter((m) => m.category !== "future_destination").length;

  function startAdd(lat?: number, lng?: number) {
    setEditing(null);
    setForm({
      ...blank,
      latitude: lat?.toFixed(5) ?? "",
      longitude: lng?.toFixed(5) ?? ""
    });
    setError(null);
    setOpen(true);
  }

  function startEdit(m: Memory) {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description ?? "",
      location_name: m.location_name ?? "",
      latitude: String(m.latitude),
      longitude: String(m.longitude),
      memory_date: m.memory_date ?? "",
      category: m.category,
      notes: m.notes ?? "",
      image_paths: m.image_paths ?? []
    });
    setError(null);
    setOpen(true);
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast("Location isn’t available in this browser.", "error");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setForm((f) => ({
          ...f,
          latitude: p.coords.latitude.toFixed(5),
          longitude: p.coords.longitude.toFixed(5)
        })),
      () => toast("Location permission was denied.", "error")
    );
  };

  const save = async () => {
    // If user hasn't explicitly entered latitude/longitude, derive a celestial position
    let lat = Number(form.latitude);
    let lng = Number(form.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng) || !form.latitude || !form.longitude) {
      // Pick a pleasing point in the sky based on count
      const idx = items.length + 1;
      const angle = (idx * 1.37) % (Math.PI * 2);
      lat = Number((Math.sin(angle) * 60).toFixed(5));
      lng = Number((Math.cos(angle) * 120).toFixed(5));
    }

    if (!form.title.trim()) return setError("Give this star a title.");
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return setError("Invalid coordinates. Coordinates must stay within the celestial sphere (-90° to 90°, -180° to 180°).");
    }

    setSaving(true);
    const values = {
      title: form.title.trim(),
      description: form.description || null,
      location_name: form.location_name || null,
      latitude: lat,
      longitude: lng,
      memory_date: form.memory_date || null,
      category: form.category,
      notes: form.notes || null,
      image_paths: form.image_paths,
      image_path: form.image_paths[0] ?? null
    };

    const ok = editing ? await update(editing.id, { ...values, is_demo: false }) : !!(await add(values));
    setSaving(false);
    if (ok) {
      setOpen(false);
      toast(editing ? "Star updated" : "Star placed in your constellation", "success");
    }
  };

  const del = async (m: Memory) => {
    if (!confirm(`Delete “${m.title}”? This can’t be undone.`)) return;
    if (await remove(m.id)) {
      setActive(null);
      // Clean up any constellation edge containing this star
      const nextEdges = (constellationConfig.edges ?? []).filter(([a, b]) => a !== m.id && b !== m.id);
      handleUpdateConstellation({ ...constellationConfig, edges: nextEdges });
      toast("Star removed from sky");
    }
  };

  const tapCounter = () => {
    if (unlocks.includes("hidden-memory")) return;
    const n = Math.min(counterTapsRef.current + 1, 3);
    counterTapsRef.current = n;
    setCounterTaps(n);
    if (n === 3) {
      unlock("hidden-memory").then(
        (fresh) => fresh && toast("You found a hidden photograph. Look in the Secret corner.", "success")
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Our Constellation"
        subtitle="A custom night sky where each star represents a special moment. Tap any star to reveal a memory, or connect them to map your journey."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="soft"
              onClick={() => {
                setNewName(constellationConfig.name || "Our Constellation");
                setNameModalOpen(true);
              }}
            >
              <Edit3 className="h-4 w-4" /> Name sky
            </Button>
            <Button onClick={() => startAdd()}>
              <Plus className="h-4 w-4" /> Place a star
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Layer tabs */}
        <div className="glass inline-flex rounded-full p-1 text-sm" role="tablist">
          {(["all", "memories", "future"] as const).map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={layer === l}
              onClick={() => setLayer(l)}
              className={`rounded-full px-4 py-1.5 transition ${
                layer === l ? "bg-cloud/15 text-cloud font-medium" : "text-lilac hover:text-cloud"
              }`}
            >
              {l === "all" ? "Whole sky" : l === "memories" ? "Past moments" : "Future wishes"}
            </button>
          ))}
        </div>

        {/* Counter with secret trigger */}
        <button id="memory-counter" onClick={tapCounter} className="scroll-mt-8 rounded-lg px-2 py-1 text-sm text-lilac transition hover:text-cream target:ring-2 target:ring-blush">
          <span className="num font-display text-xl text-cream">{pastCount}</span>{" "}
          {pastCount === 1 ? "moment" : "moments"} illuminated, {items.length - pastCount}{" "}
          {items.length - pastCount === 1 ? "wish" : "wishes"} to reach
          {counterTaps > 0 && !unlocks.includes("hidden-memory") && <span className="ml-2 text-blush" role="status">{counterTaps}/3 taps</span>}
        </button>
      </div>

      {/* Main Night Sky Constellation Canvas */}
      <div className="relative -mx-4 h-[72dvh] overflow-hidden border-y border-lilac/15 sm:mx-0 sm:rounded-[28px] sm:border">
        {loading ? (
          <Spinner label="Summoning the stars" />
        ) : (
          <ConstellationView
            stars={constellationStars}
            activeId={active}
            onSelectStar={(id) => setActive(id)}
            isPlacing={placing}
            draftCoords={
              form.latitude && form.longitude
                ? { lat: Number(form.latitude), lng: Number(form.longitude) }
                : null
            }
            onPlaceStar={(lat, lng) => {
              setForm((f) => ({ ...f, latitude: lat.toFixed(5), longitude: lng.toFixed(5) }));
              setPlacing(false);
              setOpen(true);
            }}
            constellationConfig={constellationConfig}
            onUpdateConstellation={handleUpdateConstellation}
          />
        )}

        {/* Memory Reveal Sheet */}
        <AnimatePresence>
          {selected && (
            <motion.aside
              key={selected.id}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.7 }}
              onDragEnd={(_, i) => i.offset.y > 100 && setActive(null)}
              className="glass-strong absolute inset-x-0 bottom-0 z-[100] max-h-[80%] overflow-y-auto rounded-t-[28px] p-6 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-[400px] sm:rounded-[24px] shadow-glow"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-lilac/30 sm:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blush/15 px-2.5 py-0.5 text-xs font-medium text-blush">
                      <Sparkles className="h-3 w-3" />
                      {CATEGORIES[selected.category]}
                    </span>
                    <DemoBadge show={selected.is_demo} />
                  </div>
                  <h2 className="mt-2 font-display text-3xl leading-tight text-cloud">{selected.title}</h2>
                </div>
                <IconButton label="Close" onClick={() => setActive(null)}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              {/* Location & Date */}
              <p className="mt-2.5 flex items-center gap-1.5 text-sm text-lilac">
                <MapPin className="h-3.5 w-3.5 text-blush" />
                <span>
                  {selected.location_name || "Celestial Haven"}
                  {selected.memory_date && ` · ${formatDate(selected.memory_date)}`}
                </span>
              </p>

              {/* Photos Gallery */}
              {selected.image_paths?.length > 0 && (
                <div className="mt-4 flex snap-x gap-2.5 overflow-x-auto pb-2">
                  {selected.image_paths.map((p) => (
                    <MediaImage
                      key={p}
                      path={p}
                      alt={selected.title}
                      className="h-52 w-auto shrink-0 snap-start rounded-2xl object-cover border border-lilac/20"
                    />
                  ))}
                </div>
              )}

              {/* The Story */}
              {selected.description && (
                <p className="mt-4 whitespace-pre-line leading-relaxed text-cloud/90 text-sm">
                  {selected.description}
                </p>
              )}

              {/* Romantic handwritten note */}
              {selected.notes && (
                <div className="mt-4 rounded-2xl border border-blush/25 bg-blush/5 p-4">
                  <p className="font-hand text-2xl text-blush leading-snug">“{selected.notes}”</p>
                </div>
              )}

              <p className="mt-5 text-xs text-lilac/70">
                Inscribed by {nameOf(authorOf(selected))}
              </p>

              <div className="mt-5 flex gap-2 pt-2 border-t border-lilac/15">
                <Button variant="soft" size="sm" onClick={() => startEdit(selected)}>
                  <Pencil className="h-4 w-4" /> Edit star
                </Button>
                <Button variant="danger" size="sm" onClick={() => del(selected)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Modal: New / Edit Star */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit star" : "Place a new star"}>
        <div className="space-y-4">
          <Field label="Moment title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What makes this star shine?"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date of moment">
              <Input
                type="date"
                value={form.memory_date}
                onChange={(e) => setForm({ ...form, memory_date: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Place / Memory location" hint="e.g. café, rooftop, city, or celestial sector">
            <Input
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
              placeholder="Where it took place in the world"
            />
          </Field>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Celestial Lat / Dec">
                <Input
                  inputMode="decimal"
                  placeholder="Auto (0.0)"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
              </Field>
              <Field label="Celestial Lng / RA">
                <Input
                  inputMode="decimal"
                  placeholder="Auto (0.0)"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setPlacing(true);
                }}
              >
                <Stars className="h-4 w-4 text-blush" /> Pick spot on sky
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={useMyLocation}>
                <Crosshair className="h-4 w-4 text-blush" /> Use my location
              </Button>
            </div>
          </div>

          <Field label="The story">
            <TextArea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell the memory as you remember it..."
            />
          </Field>

          <Field label="A little note" hint="Rendered in romantic handwriting script">
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="A secret quote, whisper, or inside joke"
            />
          </Field>

          <ImagePicker
            multiple
            value={form.image_paths}
            onChange={(image_paths) => setForm({ ...form, image_paths })}
            folder="memories"
            label="Attach memories & photos"
          />

          <ErrorNote message={error} />

          <Button className="w-full" onClick={save} loading={saving}>
            {editing ? "Save star changes" : "Place star in sky"}
          </Button>
        </div>
      </Modal>

      {/* Modal: Rename Constellation */}
      <Modal open={nameModalOpen} onClose={() => setNameModalOpen(false)} title="Name your constellation">
        <div className="space-y-4">
          <Field label="Constellation name" hint="e.g. Our Little Universe, Ursa Amoris, The Story of Us">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Our Constellation"
              autoFocus
            />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              if (newName.trim()) {
                handleUpdateConstellation({
                  ...constellationConfig,
                  name: newName.trim()
                });
                toast("Constellation renamed", "success");
              }
              setNameModalOpen(false);
            }}
          >
            Save name
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MemoriesInner />
    </Suspense>
  );
}
