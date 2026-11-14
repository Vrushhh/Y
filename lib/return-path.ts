export function safeReturnPath(value: string | null, fallback = "/universe"): string {
  if (!value?.startsWith("/") || /^\/[\\/]|[\\\r\n\t]/.test(value)) return fallback;
  const origin = "https://return-path.invalid";
  const target = new URL(value, origin);
  if (target.origin !== origin || target.pathname.startsWith("//") || target.pathname === "/login" || target.pathname.startsWith("/auth/")) return fallback;
  return target.pathname + target.search + target.hash;
}
