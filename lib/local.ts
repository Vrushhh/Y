/** Browser-only storage used in Preview mode (no Supabase credentials). Clearly labelled in the UI. */
const PREFIX = "olu:";

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    throw new Error("This browser’s storage is full. Preview mode keeps everything locally; connect Supabase for real storage.");
  }
}

export function removeLocal(key: string) {
  try { window.localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
