"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Compass, Flag, Gift, Mountain, Pencil, Plane, Plus, Trash2, Utensils } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { authorOf, useCollection, type Row } from "@/lib/useCollection";
import { Button, DemoBadge, EmptyState, ErrorNote, Field, IconButton, Input, Modal, PageHeader, Select, Spinner, TextArea } from "@/components/ui";
import { formatDate } from "@/lib/time";

type Goal = Row & { title: string; category: string; notes?: string | null; target_date?: string | null; completed: boolean; completed_at?: string | null };
const CATS: Record<string, { label: string; icon: typeof Plane }> = {
  places: { label: "Places to visit", icon: Plane }, restaurants: { label: "Restaurants to try", icon: Utensils },
  experiences: { label: "Experiences", icon: Compass }, adventures: { label: "Adventures", icon: Mountain },
  milestones: { label: "Personal milestones", icon: Flag }, celebrations: { label: "Future celebrations", icon: Gift }
};
const blank = { title: "", category: "experiences", notes: "", target_date: "" };

export default function BucketList() {
  const { nameOf, toast } = useApp();
  const { items, loading, add, update, remove } = useCollection<Goal>("bucket_list", { order: "created_at" });
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);

  const done = items.filter((g) => g.completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const shown = items.filter((g) => cat === "all" || g.category === cat).sort((a, b) => Number(a.completed) - Number(b.completed));

  const start = (g?: Goal) => {
    setEditing(g ?? null);
    setForm(g ? { title: g.title, category: g.category, notes: g.notes ?? "", target_date: g.target_date ?? "" } : { ...blank, category: cat === "all" ? "experiences" : cat });
    setError(null); setOpen(true);
  };
  const save = async () => {
    if (!form.title.trim()) return setError("What do you want to do together?");
    const values = { title: form.title.trim(), category: form.category, notes: form.notes || null, target_date: form.target_date || null };
    const ok = editing ? await update(editing.id, { ...values, is_demo: false }) : !!(await add({ ...values, completed: false }));
    if (ok) { setOpen(false); toast(editing ? "Plan updated" : "Added to our future", "success"); }
  };
  const toggle = async (g: Goal) => {
    const ok = await update(g.id, { completed: !g.completed, completed_at: !g.completed ? new Date().toISOString() : null });
    if (ok && !g.completed) toast("Done together. One more memory.", "success");
  };

  return (
    <div>
      <PageHeader title="Future together" subtitle="Everything we haven’t done yet, and the joy of ticking it off." action={<Button onClick={() => start()}><Plus className="h-4 w-4" /> Add a plan</Button>} />

      <div className="glass mb-8 flex items-center gap-6 rounded-[22px] p-6">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(201,188,232,0.15)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct * 0.974} 100`} />
            <defs><linearGradient id="g"><stop stopColor="#E8B9D0" /><stop offset="1" stopColor="#C9BCE8" /></linearGradient></defs>
          </svg>
          <span className="absolute inset-0 grid place-items-center num font-display text-xl">{pct}%</span>
        </div>
        <div>
          <p className="num font-display text-2xl">{done} of {items.length} done</p>
          <p className="text-sm text-lilac">Updates live on both your phones.</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {["all", ...Object.keys(CATS)].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={clsx("shrink-0 rounded-full px-4 py-1.5 text-sm", cat === c ? "bg-cloud/15 text-cloud" : "text-lilac hover:bg-cloud/5")} aria-pressed={cat === c}>
            {c === "all" ? "Everything" : CATS[c].label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : shown.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Dream something up, big or small." action={<Button onClick={() => start()}>Add a plan</Button>} />
      ) : (
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {shown.map((g) => {
              const Icon = CATS[g.category]?.icon ?? Compass;
              return (
                <motion.li layout key={g.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className={clsx("glass relative flex flex-col gap-3 rounded-[22px] p-5", g.completed && "opacity-70")}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blush/30 to-lavender/30"><Icon className="h-5 w-5 text-cloud" /></span>
                    <button onClick={() => toggle(g)} aria-pressed={g.completed} aria-label={g.completed ? "Mark as not done" : "Mark as done"}
                      className={clsx("grid h-8 w-8 place-items-center rounded-full border transition", g.completed ? "border-blush bg-blush text-midnight" : "border-lilac/40 text-transparent hover:border-blush")}>
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                  <p className={clsx("font-display text-xl leading-snug", g.completed && "line-through decoration-blush/60")}>{g.title} <DemoBadge show={g.is_demo} /></p>
                  {g.notes && <p className="text-sm text-lilac">{g.notes}</p>}
                  <p className="mt-auto text-xs text-lilac/70">
                    {g.completed && g.completed_at ? `Done ${formatDate(g.completed_at)}` : g.target_date ? `Aiming for ${formatDate(g.target_date)}` : CATS[g.category]?.label}
                    {`, added by ${nameOf(authorOf(g))}`}
                  </p>
                  <div className="absolute bottom-3 right-3 flex">
                    <IconButton label="Edit plan" onClick={() => start(g)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label="Delete plan" onClick={async () => confirm("Delete this plan?") && (await remove(g.id))}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit plan" : "A new plan"}>
        <div className="space-y-4">
          <Field label="What we’ll do"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
            <Field label="Target date"><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><TextArea className="min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <ErrorNote message={error} />
          <Button className="w-full" onClick={save}>{editing ? "Save changes" : "Add to our future"}</Button>
        </div>
      </Modal>
    </div>
  );
}
