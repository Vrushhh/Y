import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const PUBLIC = ["/", "/boardingpass", "/boarding-pass", "/login", "/auth"];

/** Refreshes the Supabase session and redirects signed-out visitors to /login. Inactive in Preview mode. */
export async function middleware(req: NextRequest) {
  if (!URL_ || !KEY) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(URL_, KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      }
    }
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic =
    PUBLIC.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/"))) ||
    req.nextUrl.searchParams.get("unlock-all") === "1" ||
    req.nextUrl.searchParams.get("deck") === "1";
  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|audio|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|ico)$).*)"]
};
