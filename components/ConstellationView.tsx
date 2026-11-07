"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Eye, EyeOff, Heart, Maximize2, Minimize2, Move,
  Plus, RotateCcw, Sparkles, Stars, Trash2, Unlink, Wand2, X, ZoomIn, ZoomOut
} from "lucide-react";
import { IconButton } from "@/components/ui";

export type StarCategory =
  | "first_meeting"
  | "first_date"
  | "favourite_place"
  | "trip"
  | "special_occasion"
  | "future_destination";

export type ConstellationStar = {
  id: string;
  title: string;
  category: string;
  memory_date?: string | null;
  location_name?: string | null;
  image_paths: string[];
  lat: number;
  lng: number;
  future: boolean;
  is_demo?: boolean;
};

export type Edge = [string, string]; // [idA, idB] where idA < idB

export type ConstellationConfig = {
  name: string;
  edges: Edge[];
  customPositions?: Record<string, { x: number; y: number }>;
};

const VIRTUAL_WIDTH = 1200;
const VIRTUAL_HEIGHT = 800;

export const STAR_PALETTES: Record<string, { core: string; glow: string; halo: string; label: string; icon: string }> = {
  first_meeting: { core: "#FFFBEB", glow: "#FCD34D", halo: "rgba(245, 158, 11, 0.45)", label: "First meeting", icon: "✨" },
  first_date: { core: "#FFF1F2", glow: "#FB7185", halo: "rgba(244, 63, 94, 0.45)", label: "First date", icon: "💖" },
  favourite_place: { core: "#EFF6FF", glow: "#60A5FA", halo: "rgba(59, 130, 246, 0.45)", label: "Favourite place", icon: "💎" },
  trip: { core: "#ECFDF5", glow: "#34D399", halo: "rgba(16, 185, 129, 0.45)", label: "Trip", icon: "🧭" },
  special_occasion: { core: "#FAF5FF", glow: "#C084FC", halo: "rgba(168, 85, 247, 0.45)", label: "Special occasion", icon: "⭐" },
  future_destination: { core: "#F5F3FF", glow: "#A78BFA", halo: "rgba(139, 92, 246, 0.55)", label: "Future dream", icon: "🪐" }
};

const DEFAULT_PALETTE = { core: "#FFFFFF", glow: "#E8B9D0", halo: "rgba(232, 185, 208, 0.45)", label: "Moment", icon: "✨" };

/** Normalizes edge pair so idA < idB */
export function normalizeEdge(a: string, b: string): Edge {
  return a < b ? [a, b] : [b, a];
}

export function edgeMatches(e1: Edge, e2: Edge): boolean {
  return (e1[0] === e2[0] && e1[1] === e2[1]) || (e1[0] === e2[1] && e1[1] === e2[0]);
}

/** Converts celestial coordinates to virtual sky canvas (x, y) */
export function coordsToSky(
  lat: number,
  lng: number,
  index: number,
  total: number,
  tightCluster: boolean
): { x: number; y: number } {
  // If coordinates are clustered (e.g. initial demo values all in central India),
  // spread them in an elegant celestial arc across the night sky.
  if (tightCluster) {
    const angle = (index / Math.max(total, 1)) * Math.PI * 1.5 + Math.PI * 0.25;
    const rx = VIRTUAL_WIDTH * 0.38;
    const ry = VIRTUAL_HEIGHT * 0.32;
    const cx = VIRTUAL_WIDTH * 0.5;
    const cy = VIRTUAL_HEIGHT * 0.48;
    // Harmonic variation so it looks organic like a natural constellation
    const wobble = Math.sin(index * 2.3) * 45;
    return {
      x: Math.round(cx + Math.cos(angle) * (rx + wobble)),
      y: Math.round(cy + Math.sin(angle) * (ry + wobble * 0.7))
    };
  }

  // Global celestial sphere projection
  const clampedLng = Math.max(-180, Math.min(180, lng));
  const clampedLat = Math.max(-90, Math.min(90, lat));
  const x = ((clampedLng + 180) / 360) * (VIRTUAL_WIDTH - 200) + 100;
  const y = ((90 - clampedLat) / 180) * (VIRTUAL_HEIGHT - 180) + 90;
  return { x: Math.round(x), y: Math.round(y) };
}

/** Converts virtual sky canvas (x, y) back to (lat, lng) */
export function skyToCoords(x: number, y: number): { lat: number; lng: number } {
  const normX = Math.max(100, Math.min(VIRTUAL_WIDTH - 100, x));
  const normY = Math.max(90, Math.min(VIRTUAL_HEIGHT - 90, y));
  const lng = ((normX - 100) / (VIRTUAL_WIDTH - 200)) * 360 - 180;
  const lat = 90 - ((normY - 90) / (VIRTUAL_HEIGHT - 180)) * 180;
  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5))
  };
}

// Generate static background stars once
function createBackgroundStars(count = 95) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    // pseudo-random with fixed seed behavior
    const x = Math.round(Math.random() * VIRTUAL_WIDTH);
    const y = Math.round(Math.random() * VIRTUAL_HEIGHT);
    const r = Number((Math.random() * 1.4 + 0.3).toFixed(2));
    const opacity = Number((Math.random() * 0.6 + 0.2).toFixed(2));
    const duration = Number((Math.random() * 3 + 2).toFixed(1));
    const delay = Number((Math.random() * 3).toFixed(1));
    stars.push({ x, y, r, opacity, duration, delay });
  }
  return stars;
}

const BG_STARS = createBackgroundStars(100);

export default function ConstellationView({
  stars,
  activeId,
  onSelectStar,
  onPlaceStar,
  draftCoords,
  isPlacing,
  constellationConfig,
  onUpdateConstellation
}: {
  stars: ConstellationStar[];
  activeId?: string | null;
  onSelectStar: (id: string) => void;
  onPlaceStar: (lat: number, lng: number) => void;
  draftCoords?: { lat: number; lng: number } | null;
  isPlacing?: boolean;
  constellationConfig: ConstellationConfig;
  onUpdateConstellation: (cfg: ConstellationConfig) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Connect Mode State
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [pointerSkyPos, setPointerSkyPos] = useState<{ x: number; y: number } | null>(null);

  // Display toggles
  const [showGrid, setShowGrid] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);

  // Check if lat/lng are tightly clustered (e.g. demo data)
  const isClustered = useMemo(() => {
    if (stars.length <= 1) return false;
    const lats = stars.map((s) => s.lat);
    const lngs = stars.map((s) => s.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return maxLat - minLat < 10 && maxLng - minLng < 10;
  }, [stars]);

  // Map each star to sky coordinates (with custom positions overrides if moved)
  const starPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    stars.forEach((s, idx) => {
      if (constellationConfig.customPositions?.[s.id]) {
        map.set(s.id, constellationConfig.customPositions[s.id]);
      } else {
        map.set(s.id, coordsToSky(s.lat, s.lng, idx, stars.length, isClustered));
      }
    });
    return map;
  }, [stars, isClustered, constellationConfig.customPositions]);

  // Draft position if placing or editing
  const draftPos = useMemo(() => {
    if (!draftCoords) return null;
    return coordsToSky(draftCoords.lat, draftCoords.lng, stars.length, stars.length + 1, false);
  }, [draftCoords, stars.length]);

  // Active edges: either custom edges, or fallback to chronological chain
  const activeEdges: Edge[] = useMemo(() => {
    if (constellationConfig.edges && constellationConfig.edges.length > 0) {
      // Filter out any edge pointing to nonexistent stars
      const starIds = new Set(stars.map((s) => s.id));
      return constellationConfig.edges.filter(([a, b]) => starIds.has(a) && starIds.has(b));
    }
    // Default: chronological chain
    if (stars.length <= 1) return [];
    const sorted = [...stars].sort((a, b) => {
      const da = a.memory_date ? new Date(a.memory_date).getTime() : 0;
      const db = b.memory_date ? new Date(b.memory_date).getTime() : 0;
      return da - db;
    });
    const chain: Edge[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      chain.push(normalizeEdge(sorted[i].id, sorted[i + 1].id));
    }
    return chain;
  }, [constellationConfig.edges, stars]);

  // Convert client pointer coordinates to virtual sky coordinates
  const clientToSky = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      // Reverse pan and zoom transforms
      // SVG center is (rect.width/2, rect.height/2)
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const unscaledX = (clickX - cx - pan.x) / zoom + cx;
      const unscaledY = (clickY - cy - pan.y) / zoom + cy;

      // Scale to virtual dimensions
      const scaleX = VIRTUAL_WIDTH / rect.width;
      const scaleY = VIRTUAL_HEIGHT / rect.height;

      const skyX = Math.max(40, Math.min(VIRTUAL_WIDTH - 40, unscaledX * scaleX));
      const skyY = Math.max(40, Math.min(VIRTUAL_HEIGHT - 40, unscaledY * scaleY));

      return { x: Math.round(skyX), y: Math.round(skyY) };
    },
    [pan, zoom]
  );

  // Mouse / Touch Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only pan if target is background SVG or celestial canvas
    const target = e.target as HTMLElement | SVGElement;
    const isStarOrButton = target.closest("[data-star]") || target.closest("button") || target.closest("[data-control]");
    if (isStarOrButton) return;

    setIsPanning(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }

    if (connectMode && connectSource) {
      setPointerSkyPos(clientToSky(e.clientX, e.clientY));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch { }
    }
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((z) => Math.max(0.65, Math.min(2.8, z * factor)));
  };

  // Double click or click on sky while placing
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isPanning) return;
    const target = e.target as HTMLElement | SVGElement;
    if (target.closest("[data-star]") || target.closest("button") || target.closest("[data-control]")) return;

    const skyPos = clientToSky(e.clientX, e.clientY);

    if (isPlacing) {
      const coords = skyToCoords(skyPos.x, skyPos.y);
      onPlaceStar(coords.lat, coords.lng);
      return;
    }

    // If connecting and clicking outside, cancel connection source
    if (connectMode && connectSource) {
      setConnectSource(null);
      setPointerSkyPos(null);
    }
  };

  const handleStarClick = (starId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (connectMode) {
      if (!connectSource) {
        setConnectSource(starId);
      } else if (connectSource === starId) {
        setConnectSource(null);
        setPointerSkyPos(null);
      } else {
        // Toggle edge between connectSource and starId
        toggleEdge(connectSource, starId);
        setConnectSource(null);
        setPointerSkyPos(null);
      }
      return;
    }

    onSelectStar(starId);
  };

  const toggleEdge = (idA: string, idB: string) => {
    const pair = normalizeEdge(idA, idB);
    const existing = activeEdges.find((e) => edgeMatches(e, pair));
    let next: Edge[];
    if (existing) {
      next = activeEdges.filter((e) => !edgeMatches(e, pair));
    } else {
      next = [...activeEdges, pair];
    }
    onUpdateConstellation({
      ...constellationConfig,
      edges: next
    });
  };

  // Preset: Chronological Constellation
  const connectChronological = () => {
    if (stars.length <= 1) return;
    const sorted = [...stars].sort((a, b) => {
      const da = a.memory_date ? new Date(a.memory_date).getTime() : 0;
      const db = b.memory_date ? new Date(b.memory_date).getTime() : 0;
      return da - db;
    });
    const chain: Edge[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      chain.push(normalizeEdge(sorted[i].id, sorted[i + 1].id));
    }
    onUpdateConstellation({
      ...constellationConfig,
      edges: chain
    });
  };

  // Preset: Heart Shape Constellation (arranges and links them in a heart loop)
  const formHeartShape = () => {
    if (stars.length < 3) {
      connectChronological();
      return;
    }
    const count = stars.length;
    const custom: Record<string, { x: number; y: number }> = {};
    const edges: Edge[] = [];

    // Parametric heart: x = 16 sin^3(t), y = -(13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t))
    const cx = VIRTUAL_WIDTH / 2;
    const cy = VIRTUAL_HEIGHT / 2 + 30;
    const scale = Math.min(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) * 0.021;

    stars.forEach((s, i) => {
      const t = (i / count) * Math.PI * 2 - Math.PI / 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      custom[s.id] = {
        x: Math.round(cx + hx * scale),
        y: Math.round(cy + hy * scale)
      };
      if (i > 0) edges.push(normalizeEdge(stars[i - 1].id, stars[i].id));
    });
    edges.push(normalizeEdge(stars[count - 1].id, stars[0].id));

    onUpdateConstellation({
      ...constellationConfig,
      edges,
      customPositions: { ...(constellationConfig.customPositions ?? {}), ...custom }
    });
  };

  const clearAllEdges = () => {
    onUpdateConstellation({
      ...constellationConfig,
      edges: []
    });
    setConnectSource(null);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const sourcePos = connectSource ? starPositions.get(connectSource) : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      className="relative h-full w-full select-none overflow-hidden rounded-[28px] bg-[#0c0919] cursor-grab active:cursor-grabbing"
    >
      {/* Cosmic Nebula Backdrops */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `
            radial-gradient(circle at 25% 30%, rgba(232, 185, 208, 0.16) 0%, transparent 55%),
            radial-gradient(circle at 75% 65%, rgba(141, 120, 181, 0.22) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(112, 193, 179, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(248, 232, 216, 0.12) 0%, transparent 40%),
            linear-gradient(180deg, #130d24 0%, #0c0919 50%, #160f2b 100%)
          `
        }}
      />

      {/* Main SVG Sky Canvas */}
      <svg
        viewBox={`0 0 ${VIRTUAL_WIDTH} ${VIRTUAL_HEIGHT}`}
        className="pointer-events-auto h-full w-full transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center"
        }}
      >
        <defs>
          {/* Constellation Starlight Gradient */}
          <linearGradient id="starlightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8E8D8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#E8B9D0" stopOpacity="1" />
            <stop offset="100%" stopColor="#C9BCE8" stopOpacity="0.85" />
          </linearGradient>

          {/* Active Connect Beam Gradient */}
          <linearGradient id="connectBeamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0.9" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="lineGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Twinkling Background Stars */}
        <g className="opacity-75">
          {BG_STARS.map((s, idx) => (
            <circle
              key={idx}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#F8E8D8"
              opacity={s.opacity}
              style={{
                animation: `glow ${s.duration}s ease-in-out ${s.delay}s infinite alternate`
              }}
            />
          ))}
        </g>

        {/* Optional Celestial Sky Grid */}
        {showGrid && (
          <g className="text-lilac/10" stroke="currentColor" strokeDasharray="3 7" strokeWidth="0.8" fill="none">
            {/* Right Ascension Rings */}
            <circle cx={VIRTUAL_WIDTH / 2} cy={VIRTUAL_HEIGHT / 2} r={180} />
            <circle cx={VIRTUAL_WIDTH / 2} cy={VIRTUAL_HEIGHT / 2} r={320} />
            <circle cx={VIRTUAL_WIDTH / 2} cy={VIRTUAL_HEIGHT / 2} r={460} />
            {/* Celestial Meridian Lines */}
            <line x1={0} y1={VIRTUAL_HEIGHT / 2} x2={VIRTUAL_WIDTH} y2={VIRTUAL_HEIGHT / 2} />
            <line x1={VIRTUAL_WIDTH / 2} y1={0} x2={VIRTUAL_WIDTH / 2} y2={VIRTUAL_HEIGHT} />
            <line x1={0} y1={0} x2={VIRTUAL_WIDTH} y2={VIRTUAL_HEIGHT} strokeDasharray="2 12" />
            <line x1={0} y1={VIRTUAL_HEIGHT} x2={VIRTUAL_WIDTH} y2={0} strokeDasharray="2 12" />
          </g>
        )}

        {/* Constellation Lines */}
        <g id="constellation-lines">
          {activeEdges.map(([idA, idB], idx) => {
            const pA = starPositions.get(idA);
            const pB = starPositions.get(idB);
            if (!pA || !pB) return null;
            const isHovered = hoveredEdge && edgeMatches(hoveredEdge, [idA, idB]);

            return (
              <g
                key={`edge-${idA}-${idB}-${idx}`}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredEdge([idA, idB])}
                onMouseLeave={() => setHoveredEdge(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (connectMode) toggleEdge(idA, idB);
                }}
              >
                {/* Thick invisible hit area for easy clicking */}
                <line
                  x1={pA.x}
                  y1={pA.y}
                  x2={pB.x}
                  y2={pB.y}
                  stroke="transparent"
                  strokeWidth="20"
                />

                {/* Outer ethereal halo */}
                <line
                  x1={pA.x}
                  y1={pA.y}
                  x2={pB.x}
                  y2={pB.y}
                  stroke={isHovered && connectMode ? "#F43F5E" : "#E8B9D0"}
                  strokeWidth={isHovered ? "6" : "3.5"}
                  strokeOpacity={isHovered ? "0.6" : "0.35"}
                  filter="url(#lineGlow)"
                  className="transition-all duration-200"
                />

                {/* Main starlight beam */}
                <line
                  x1={pA.x}
                  y1={pA.y}
                  x2={pB.x}
                  y2={pB.y}
                  stroke={isHovered && connectMode ? "#FB7185" : "url(#starlightGradient)"}
                  strokeWidth="1.8"
                  strokeOpacity="0.9"
                  strokeDasharray={connectMode ? "5 3" : undefined}
                />

                {/* Midpoint celestial sparkle dot */}
                <circle
                  cx={(pA.x + pB.x) / 2}
                  cy={(pA.y + pB.y) / 2}
                  r={isHovered ? "4" : "2"}
                  fill={isHovered && connectMode ? "#FDA4AF" : "#F8E8D8"}
                  opacity="0.8"
                />
              </g>
            );
          })}

          {/* Active Connecting Beam following cursor */}
          {connectMode && sourcePos && pointerSkyPos && (
            <g className="pointer-events-none">
              <line
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={pointerSkyPos.x}
                y2={pointerSkyPos.y}
                stroke="#FCD34D"
                strokeWidth="4"
                strokeOpacity="0.4"
                filter="url(#lineGlow)"
              />
              <line
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={pointerSkyPos.x}
                y2={pointerSkyPos.y}
                stroke="url(#connectBeamGradient)"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
            </g>
          )}
        </g>

        {/* Draft Star (when placing or editing coordinates) */}
        {draftPos && (
          <g transform={`translate(${draftPos.x}, ${draftPos.y})`} className="pointer-events-none animate-pulse">
            <circle r="22" fill="none" stroke="#FCD34D" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle r="5" fill="#FCD34D" filter="url(#starGlow)" />
          </g>
        )}

        {/* Constellation Stars */}
        <g id="constellation-stars">
          {stars.map((s) => {
            const pos = starPositions.get(s.id);
            if (!pos) return null;
            const pal = STAR_PALETTES[s.category] || DEFAULT_PALETTE;
            const isActive = s.id === activeId;
            const isHovered = s.id === hoveredStarId;
            const isSource = s.id === connectSource;
            const hasPhotos = s.image_paths && s.image_paths.length > 0;

            return (
              <g
                key={s.id}
                data-star={s.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer transition-transform duration-200"
                onClick={(e) => handleStarClick(s.id, e)}
                onMouseEnter={() => setHoveredStarId(s.id)}
                onMouseLeave={() => setHoveredStarId(null)}
              >
                {/* Hit area */}
                <circle r="28" fill="transparent" />

                {/* Connecting Source Aura */}
                {isSource && (
                  <g className="animate-spin" style={{ transformOrigin: "0 0", animationDuration: "8s" }}>
                    <circle r="26" fill="none" stroke="#FCD34D" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.9" />
                    <circle r="32" fill="none" stroke="#FB7185" strokeWidth="1" strokeDasharray="3 7" opacity="0.7" />
                  </g>
                )}

                {/* Active Selection Orbit Ring */}
                {isActive && !isSource && (
                  <g className="animate-pulse">
                    <circle r="24" fill="none" stroke="#E8B9D0" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.95" />
                    <circle r="30" fill="none" stroke="#C9BCE8" strokeWidth="0.8" opacity="0.5" />
                  </g>
                )}

                {/* Future Destination Outer Pulsar Rings */}
                {s.future && (
                  <circle
                    r="16"
                    fill="none"
                    stroke={pal.glow}
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ animationDuration: "14s", transformOrigin: "0 0" }}
                  />
                )}

                {/* Outer Nebula Halo */}
                <circle
                  r={isActive || isHovered ? "20" : "12"}
                  fill={pal.halo}
                  filter="url(#starGlow)"
                  className="transition-all duration-300"
                />

                {/* 4-Point Starlight Diffraction Spikes (Diamond Flare) */}
                <path
                  d={`
                    M 0 ${-(isActive || isHovered ? 16 : 10)}
                    Q 0 0 ${isActive || isHovered ? 16 : 10} 0
                    Q 0 0 0 ${isActive || isHovered ? 16 : 10}
                    Q 0 0 ${-(isActive || isHovered ? 16 : 10)} 0
                    Q 0 0 0 ${-(isActive || isHovered ? 16 : 10)}
                    Z
                  `}
                  fill={pal.glow}
                  opacity={isActive || isHovered ? 0.95 : 0.75}
                  filter="url(#starGlow)"
                  className="transition-all duration-200"
                />

                {/* Bright Core Star Disc */}
                <circle
                  r={isActive || isHovered ? "5.5" : "3.8"}
                  fill={pal.core}
                  className="transition-all duration-150"
                />

                {/* Photo indicator badge (tiny stardust ring) */}
                {hasPhotos && (
                  <circle
                    cx="7"
                    cy="-7"
                    r="2.2"
                    fill="#F8E8D8"
                    stroke="#211A36"
                    strokeWidth="0.8"
                  />
                )}

                {/* Star Label */}
                {showLabels && (
                  <g
                    transform="translate(0, 20)"
                    className="pointer-events-none transition-opacity duration-200"
                    opacity={isActive || isHovered ? 1 : 0.82}
                  >
                    {/* Semi-transparent text backdrop for clarity */}
                    <rect
                      x={-s.title.length * 3.8 - 8}
                      y="-1"
                      width={s.title.length * 7.6 + 16}
                      height="18"
                      rx="9"
                      fill="#130d24"
                      fillOpacity={isActive || isHovered ? "0.85" : "0.65"}
                      stroke={isActive ? "#E8B9D0" : "#40345C"}
                      strokeWidth="0.6"
                    />
                    <text
                      textAnchor="middle"
                      y="11"
                      className="font-sans text-[11px] font-medium tracking-wide"
                      fill={isActive ? "#F8E8D8" : "#E8B9D0"}
                    >
                      {s.title}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Constellation Header Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-between px-4 sm:px-6">
        <div className="pointer-events-auto glass-strong flex items-center gap-2.5 rounded-full px-4 py-2 shadow-soft">
          <Stars className="h-4 w-4 text-blush animate-pulse" />
          <span className="font-display text-base tracking-wide text-cloud">
            {constellationConfig.name || "Our Constellation"}
          </span>
          <span className="h-1 w-1 rounded-full bg-lilac/40" />
          <span className="text-xs text-lilac">
            {stars.length} {stars.length === 1 ? "star" : "stars"} · {activeEdges.length} connections
          </span>
        </div>

        {/* View Toggles (Grid, Labels, Center) */}
        <div className="pointer-events-auto glass-strong flex items-center gap-1 rounded-full p-1 shadow-soft">
          <button
            onClick={() => setShowLabels((v) => !v)}
            title={showLabels ? "Hide star titles" : "Show star titles"}
            className={`rounded-full p-1.5 transition ${showLabels ? "bg-cloud/15 text-cream" : "text-lilac hover:text-cloud"}`}
          >
            {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowGrid((v) => !v)}
            title={showGrid ? "Hide celestial grid" : "Show celestial grid"}
            className={`rounded-full p-1.5 transition ${showGrid ? "bg-cloud/15 text-cream" : "text-lilac hover:text-cloud"}`}
          >
            <Compass className="h-4 w-4" />
          </button>
          <button
            onClick={resetView}
            title="Recenter sky"
            className="rounded-full p-1.5 text-lilac hover:bg-cloud/10 hover:text-cloud transition"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Connect Mode Banner */}
      <AnimatePresence>
        {connectMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-auto absolute inset-x-4 top-16 mx-auto max-w-md rounded-2xl border border-blush/40 bg-midnight/90 p-3 text-center shadow-glow backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-left text-xs text-cloud">
                <Sparkles className="h-4 w-4 text-blush shrink-0" />
                <span>
                  {connectSource
                    ? "Now tap a second star to draw or remove a starlight beam."
                    : "Tap two stars to connect them into your constellation."}
                </span>
              </div>
              <button
                onClick={() => {
                  setConnectMode(false);
                  setConnectSource(null);
                }}
                className="rounded-full p-1 text-lilac hover:bg-cloud/10 hover:text-cloud"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Shape Presets */}
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 border-t border-lilac/15 pt-2 text-[11px]">
              <button
                onClick={connectChronological}
                className="inline-flex items-center gap-1 rounded-full bg-cloud/10 px-2.5 py-1 text-cloud hover:bg-cloud/20"
              >
                <Wand2 className="h-3 w-3 text-blush" /> Story Path
              </button>
              <button
                onClick={formHeartShape}
                className="inline-flex items-center gap-1 rounded-full bg-cloud/10 px-2.5 py-1 text-cloud hover:bg-cloud/20"
              >
                <Heart className="h-3 w-3 text-blush" /> Celestial Heart
              </button>
              <button
                onClick={clearAllEdges}
                className="inline-flex items-center gap-1 rounded-full bg-cloud/10 px-2.5 py-1 text-lilac hover:bg-[#5a2340]/40 hover:text-blush"
              >
                <Trash2 className="h-3 w-3" /> Clear Lines
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placing Star Banner */}
      <AnimatePresence>
        {isPlacing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-auto absolute inset-x-4 top-16 mx-auto max-w-sm rounded-2xl border border-blush/40 bg-midnight/90 p-3 text-center shadow-glow backdrop-blur-md"
          >
            <p className="text-xs font-medium text-cloud">
              ✨ Tap anywhere in the night sky to place your new star.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation Controls */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between">
        {/* Constellation Mode Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              setConnectMode((v) => !v);
              setConnectSource(null);
            }}
            className={`glass-strong flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium shadow-soft transition ${connectMode
                ? "border-blush bg-gradient-to-r from-blush/30 to-lilac/30 text-cream"
                : "text-lilac hover:bg-cloud/10 hover:text-cloud"
              }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blush" />
            {connectMode ? "Done Connecting" : "Connect Stars"}
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="pointer-events-auto glass-strong flex items-center gap-1 rounded-full p-1 shadow-soft">
          <button
            onClick={() => setZoom((z) => Math.min(2.8, z * 1.2))}
            title="Zoom in"
            className="rounded-full p-2 text-lilac hover:bg-cloud/10 hover:text-cloud transition"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="px-1 text-[11px] font-mono text-lilac/80">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.65, z * 0.8))}
            title="Zoom out"
            className="rounded-full p-2 text-lilac hover:bg-cloud/10 hover:text-cloud transition"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

