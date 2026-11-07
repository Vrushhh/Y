# Our Little Universe

*Two people. One universe. Infinite memories.*

A private anniversary web app for exactly two people: a cinematic welcome, a memory map, two-player date games played from two phones, love letters, a photobooth, a timeline, a jar of reasons, a soundtrack, a shared bucket list, a sealed time capsule and a secret corner.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Leaflet and Supabase (Postgres, Auth, Realtime, Storage).

## Run it locally

Requires Node.js 18.18 or newer.

```bash
npm install
cp .env.example .env.local   # leave it empty to explore in Preview mode
npm run dev
```

Open http://localhost:3000.

**Preview mode.** With no Supabase keys, the app runs entirely in your browser so you can look around. A banner says so on every page. Data stays in this browser only, there is no sign-in, and Date Mode is switched off because it needs the real backend. Nothing pretends to be saved to a server.

**Full mode.** Add your Supabase keys to `.env.local` and follow [SETUP_GUIDE.md](SETUP_GUIDE.md). Takes about 20 minutes.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js rules) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright, desktop + mobile, Preview mode). Run `npx playwright install chromium` once first |
| `npm run test:db` | Applies the migrations to a throwaway local Postgres 16 and runs the privacy and game tests. Needs Postgres installed locally |
| `npm run check` | Typecheck, lint, unit tests and build in one go |

## Where things live

```
app/
  page.tsx                  Welcome intro (envelope, typewriter, live counter)
  login/                    Private sign-in (password or email link, no sign-up)
  auth/callback, confirm    Email-link handlers
  api/invite/               Sends the partner invitation (server only)
  (app)/                    Everything behind sign-in
    universe/ memories/ date-mode/ date-mode/room/[id]/ letters/ photobooth/
    timeline/ reasons/ soundtrack/ bucket-list/ time-capsule/ secret/ settings/
components/                 Design system (ui.tsx), nav, starfield, envelope, map, media inputs
lib/                        Supabase clients, data hook, media upload, time maths, game scoring
middleware.ts               Session refresh + route protection
supabase/migrations/        Schema, RLS, functions, storage, realtime, seed questions
supabase/tests/             Database integration tests
tests/  e2e/                Unit and browser tests
```

## How privacy is enforced

Every rule below lives in Postgres, not in the browser.

- Every private table has Row Level Security limited to the two members of the relationship. A relationship can never have a third member (trigger).
- Authorship is set by the database from the signed-in user, so it can't be faked.
- Game state can only change through database functions. They lock the room row, so two phones can't both reveal or advance the same round. Each person can answer a round once (unique constraint).
- Your partner's answer is invisible to you until the round is revealed (RLS on `game_answers`, and that table is not broadcast over Realtime).
- Time-capsule messages and their photos can't be read by anyone, including the author, until `unlock_at`. There is no update or delete policy, so a sealed capsule can't change.
- Letter drafts are visible only to their author. The secret letter opens only after the secret is found.
- Media lives in a private bucket and is shown through short-lived signed URLs. Capsule and secret photos have their own stricter rules.
- The service-role key is used only on the server, only to send the invite email.

See [SETUP_GUIDE.md](SETUP_GUIDE.md), [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) and [PROJECT_STATUS.md](PROJECT_STATUS.md).
