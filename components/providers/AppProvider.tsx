"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getSupabase } from "@/lib/supabase/client";
import { DEFAULT_START_DATE, isSupabaseConfigured } from "@/lib/config";
import { parseLocalDate } from "@/lib/time";
import { readLocal, uid, writeLocal } from "@/lib/local";
import { DEMO } from "@/lib/demo";

export type Member = { user_id: string; display_name: string; avatar_url: string | null; role?: string };
export type Relationship = { id: string; name: string; start_date: string };
export type Prefs = { music_enabled: boolean; animation_enabled: boolean };
type Tone = "info" | "error" | "success";

type AppCtx = {
  mode: "supabase" | "preview";
  ready: boolean;
  userId: string | null;
  email: string | null;
  relationship: Relationship | null;
  members: Member[];
  me: Member | null;
  partner: Member | null;
  startDate: Date;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => Promise<void>;
  refresh: () => Promise<void>;
  nameOf: (id?: string | null) => string;
  toast: (message: string, tone?: Tone) => void;
  unlocks: string[];
  unlock: (key: string) => Promise<boolean>;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

const PREVIEW_ME = "preview-you";
const PREVIEW_PARTNER = "preview-partner";
const DEFAULT_PREFS: Prefs = { music_enabled: false, animation_enabled: true };

function seedPreview() {
  if (readLocal("seeded", false)) return;
  const now = new Date().toISOString();
  for (const [table, rows] of Object.entries(DEMO)) {
    writeLocal(table, rows.map((r) => ({
      id: uid(), created_at: now, relationship_id: "preview", is_demo: true,
      created_by: PREVIEW_ME, author_id: PREVIEW_ME, added_by: PREVIEW_ME, ...r
    })));
  }
  writeLocal("seeded", true);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const mode: "supabase" | "preview" = isSupabaseConfigured ? "supabase" : "preview";
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; tone: Tone }[]>([]);

  const toast = useCallback((message: string, tone: Tone = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    if (mode === "preview") {
      seedPreview();
      setUserId(PREVIEW_ME);
      setRelationship(readLocal<Relationship>("relationship", { id: "preview", name: "Our Little Universe", start_date: DEFAULT_START_DATE }));
      setMembers(readLocal<Member[]>("members", [
        { user_id: PREVIEW_ME, display_name: "You", avatar_url: null, role: "owner" },
        { user_id: PREVIEW_PARTNER, display_name: "Your person", avatar_url: null, role: "member" }
      ]));
      setPrefsState(readLocal<Prefs>("prefs", DEFAULT_PREFS));
      setUnlocks(readLocal<string[]>("unlocks", []));
      setReady(true);
      return;
    }
    const sb = getSupabase()!;
    const { data: { user } } = await sb.auth.getUser();
    setUserId(user?.id ?? null);
    setEmail(user?.email ?? null);
    if (!user) { setRelationship(null); setMembers([]); setReady(true); return; }

    await sb.rpc("accept_pending_invite");
    const { data: mine } = await sb.from("relationship_members").select("relationship_id").eq("user_id", user.id).maybeSingle();
    if (!mine) { setRelationship(null); setMembers([]); setReady(true); return; }

    const [rel, mem, pref, unl] = await Promise.all([
      sb.from("relationships").select("id,name,start_date").eq("id", mine.relationship_id).single(),
      sb.from("relationship_members").select("user_id,display_name,avatar_url,role").eq("relationship_id", mine.relationship_id),
      sb.from("user_preferences").select("music_enabled,animation_enabled").eq("user_id", user.id).maybeSingle(),
      sb.from("surprise_unlocks").select("unlock_key").eq("user_id", user.id)
    ]);
    setRelationship((rel.data as Relationship) ?? null);
    setMembers((mem.data as Member[]) ?? []);
    setPrefsState((pref.data as Prefs) ?? DEFAULT_PREFS);
    setUnlocks(((unl.data as { unlock_key: string }[]) ?? []).map((u) => u.unlock_key));
    setReady(true);
  }, [mode]);

  useEffect(() => {
    refresh();
    if (mode !== "supabase") return;
    const sb = getSupabase()!;
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [mode, refresh]);

  const setPrefs = useCallback(async (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefsState(next);
    if (mode === "preview") { writeLocal("prefs", next); return; }
    const sb = getSupabase()!;
    const { error } = await sb.from("user_preferences").upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    if (error) toast(error.message, "error");
  }, [prefs, mode, userId, toast]);

  const unlock = useCallback(async (key: string) => {
    if (!userId || unlocks.includes(key)) return false;
    try {
      let fresh: boolean;
      if (mode === "preview") {
        const saved = readLocal<string[]>("unlocks", []);
        fresh = !saved.includes(key);
        if (fresh) writeLocal("unlocks", [...saved, key]);
      } else {
        const { data, error } = await getSupabase()!.from("surprise_unlocks")
          .upsert({ unlock_key: key, user_id: userId }, { onConflict: "user_id,unlock_key", ignoreDuplicates: true })
          .select("unlock_key");
        if (error) throw error;
        fresh = !!data?.length;
      }
      setUnlocks((saved) => saved.includes(key) ? saved : [...saved, key]);
      return fresh;
    } catch {
      toast("Couldn’t save your discovery. Try again.", "error");
      return false;
    }
  }, [unlocks, mode, userId, toast]);

  const me = members.find((m) => m.user_id === userId) ?? null;
  const partner = members.find((m) => m.user_id !== userId) ?? null;

  const value = useMemo<AppCtx>(() => ({
    mode, ready, userId, email, relationship, members, me, partner,
    startDate: parseLocalDate(relationship?.start_date ?? DEFAULT_START_DATE),
    prefs, setPrefs, refresh, toast, unlocks, unlock,
    nameOf: (id) => members.find((m) => m.user_id === id)?.display_name ?? (id ? "Someone" : "")
  }), [mode, ready, userId, email, relationship, members, me, partner, prefs, setPrefs, refresh, toast, unlocks, unlock]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className={`pointer-events-auto max-w-md rounded-2xl px-5 py-3 text-sm shadow-soft backdrop-blur-xl ${
                t.tone === "error" ? "bg-[#5a2340]/90 text-cloud" : t.tone === "success" ? "bg-deep/90 text-cloud" : "bg-midnight/90 text-cloud"
              } border border-lilac/20`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
