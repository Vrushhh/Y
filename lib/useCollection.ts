"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";
import { readLocal, uid, writeLocal } from "@/lib/local";

export type Row = { id: string; created_at?: string; is_demo?: boolean } & Record<string, unknown>;

type Options = { order?: string; ascending?: boolean; realtime?: boolean };

/**
 * Shared data hook for relationship-scoped tables.
 * Supabase mode reads/writes Postgres (RLS limits rows to the couple) and listens for realtime changes.
 * Preview mode reads/writes this browser only and the UI shows a banner saying so.
 */
export function useCollection<T extends Row>(table: string, opts: Options = {}) {
  const { mode, relationship, userId, toast } = useApp();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const sortLocal = useCallback((rows: T[]) => {
    const { order, ascending = true } = optsRef.current;
    if (!order) return rows;
    return [...rows].sort((a, b) => {
      const av = (a[order] ?? "") as string | number, bv = (b[order] ?? "") as string | number;
      return (av > bv ? 1 : av < bv ? -1 : 0) * (ascending ? 1 : -1);
    });
  }, []);

  const load = useCallback(async () => {
    if (mode === "preview") {
      setItems(sortLocal(readLocal<T[]>(table, [])));
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb || !relationship) { setLoading(false); return; }
    let q: any = sb.from(table).select("*").eq("relationship_id", relationship.id);
    if (optsRef.current.order) q = q.order(optsRef.current.order, { ascending: optsRef.current.ascending ?? true });
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else { setError(null); setItems((data ?? []) as T[]); }
    setLoading(false);
  }, [mode, relationship, table, sortLocal]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode !== "supabase" || !relationship || opts.realtime === false) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`${table}:${relationship.id}:${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `relationship_id=eq.${relationship.id}` }, () => load())
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [mode, relationship, table, load, opts.realtime]);

  const add = useCallback(async (values: Partial<T>): Promise<T | null> => {
    try {
      if (mode === "preview") {
        const row = {
          id: uid(), created_at: new Date().toISOString(), relationship_id: "preview",
          created_by: userId, author_id: userId, added_by: userId, is_demo: false, ...values
        } as unknown as T;
        writeLocal(table, [...readLocal<T[]>(table, []), row]);
        await load();
        return row;
      }
      const sb = getSupabase()!;
      const { data, error: err } = await sb.from(table).insert(values).select().single();
      if (err) throw new Error(err.message);
      await load();
      return data as T;
    } catch (e) {
      toast((e as Error).message, "error");
      return null;
    }
  }, [mode, table, userId, load, toast]);

  const update = useCallback(async (id: string, values: Partial<T>): Promise<boolean> => {
    try {
      if (mode === "preview") {
        writeLocal(table, readLocal<T[]>(table, []).map((r) => (r.id === id ? { ...r, ...values } : r)));
        await load();
        return true;
      }
      const { error: err } = await getSupabase()!.from(table).update(values).eq("id", id);
      if (err) throw new Error(err.message);
      await load();
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    }
  }, [mode, table, load, toast]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (mode === "preview") {
        writeLocal(table, readLocal<T[]>(table, []).filter((r) => r.id !== id));
        await load();
        return true;
      }
      const { error: err } = await getSupabase()!.from(table).delete().eq("id", id);
      if (err) throw new Error(err.message);
      await load();
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    }
  }, [mode, table, load, toast]);

  return { items, loading, error, add, update, remove, refresh: load };
}

export const authorOf = (row: Record<string, unknown>) =>
  (row.author_id ?? row.created_by ?? row.added_by ?? null) as string | null;
