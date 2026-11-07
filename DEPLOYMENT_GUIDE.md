# Deployment guide (Vercel)

## 1. Push the code

Push this folder to a **private** GitHub repository. `.env*` files are git-ignored. Keep it that way.

## 2. Import into Vercel

1. https://vercel.com → **Add New → Project** → import the repository. The framework is detected as Next.js, and the defaults are correct.
2. Under **Environment Variables**, add these for Production (and Preview if you use preview deployments):

| Variable | Value | Exposed to browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Yes (safe, RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **No.** Server only, used by `/api/invite` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` (no trailing slash) | Yes |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional public `pk.` token | Yes. Restrict it to your domain in Mapbox |

3. Deploy.

## 3. Point Supabase at the live URL

In **Authentication → URL Configuration**, set **Site URL** to the production URL and add `https://your-app.vercel.app/**` to **Redirect URLs**. The email templates from the setup guide use `{{ .SiteURL }}`, so they follow automatically.

A custom domain? Add it in Vercel, then update `NEXT_PUBLIC_SITE_URL`, the Supabase Site URL and the Redirect URLs, and redeploy.

## 4. Security checklist before sharing the link

- [ ] “Allow new users to sign up” is **off** in Supabase.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix and isn't in the repo. Search the code for `service_role` to be sure.
- [ ] In **Table Editor**, every table shows RLS enabled. **Advisors → Security Advisor** shows no “RLS disabled” errors.
- [ ] Storage bucket `media` is **private**.
- [ ] Sign out and open `/universe`: you're redirected to `/login`.
- [ ] From a third email (if you made one for testing), sign-in shows “Create our universe” and none of your data. Delete that test user afterwards. (Creating a universe of their own doesn't give them access to yours.)
- [ ] Seal a test time capsule for tomorrow. Neither of you can read it. Its title shows, its message doesn't.
- [ ] Play one game on two phones. While one person waits, the other's answer isn't visible anywhere.
- [ ] Turn on **Leaked password protection** and set a strong minimum password length under Authentication settings.
- [ ] Keep the Supabase project on a plan that won't pause it from inactivity (free projects pause after a week without traffic).

## 5. Before every deploy

```bash
npm run check   # typecheck + lint + unit tests + production build
```

## Notes on hosting

- The app sends `X-Robots-Tag: noindex` and `X-Frame-Options: DENY`, and asks search engines not to index it. Privacy comes from authentication, not from an obscure URL.
- Media is served through signed URLs that expire after one hour and are re-signed as needed.
- Backups: Supabase paid plans include daily backups. On the free plan, export occasionally from **Database → Backups** or with `supabase db dump`, and download the `media` bucket.
