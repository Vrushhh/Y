"use client";
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { MAPBOX_TOKEN } from "@/lib/config";

export type Pin = { id: string; lat: number; lng: number; future: boolean; title: string };

const icon = (future: boolean, active: boolean) =>
  L.divIcon({ className: `memory-pin ${future ? "future" : ""}`, html: `<span style="${active ? "transform:scale(1.5)" : ""}"></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });

function ClickCatcher({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FitTo({ pins, focus }: { pins: Pin[]; focus?: Pin | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) { map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 10), { duration: 0.8 }); return; }
  }, [focus, map]);
  useEffect(() => {
    if (!pins.length) return;
    const b = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [60, 60], maxZoom: 11 });
    // Only on first load of pins
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.length > 0]);
  return null;
}

export default function MapView({ pins, activeId, onSelect, onPick, draft }: {
  pins: Pin[]; activeId?: string | null; onSelect: (id: string) => void; onPick?: (lat: number, lng: number) => void; draft?: { lat: number; lng: number } | null;
}) {
  const tiles = MAPBOX_TOKEN
    ? { url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`, attribution: "© Mapbox © OpenStreetMap", className: "" }
    : // Free fallback: standard OpenStreetMap tiles, tinted to the night palette with CSS (see globals.css)
      { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors", className: "olu-night-tiles" };
  return (
    <MapContainer center={[20.6, 78.9]} zoom={4} className="h-full w-full" zoomControl worldCopyJump>
      <TileLayer url={tiles.url} attribution={tiles.attribution} className={tiles.className} maxZoom={19} />
      <ClickCatcher onPick={onPick} />
      <FitTo pins={pins} focus={pins.find((p) => p.id === activeId) ?? null} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p.future, p.id === activeId)} title={p.title} eventHandlers={{ click: () => onSelect(p.id) }} />
      ))}
      {draft && <Marker position={[draft.lat, draft.lng]} icon={icon(false, true)} />}
    </MapContainer>
  );
}
