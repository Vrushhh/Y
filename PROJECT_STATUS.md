# Project status

Last updated: 7 November 2026. First anniversary: 16 November 2026.

## Complete

| Area | Status |
| --- | --- |
| Welcome intro: starfield, opening envelope, typewriter line, live counter, replay, optional music after a tap, remembers completion | Done |
| Dashboard: greeting, counter, anniversary countdown, featured photo, 8 experience cards, recent memories, random reason, upcoming plans, soundtrack, secret indicator | Done |
| Memory map: Leaflet, add/edit/delete, photos, 6 categories, future-destination layer, counter, mobile bottom sheet, pick on map or GPS | Done |
| Date mode: 8 games, rooms, invite link, waiting room, ready states, private answers, simultaneous reveal, scoring, results, rematch, expiry, reconnect, presence, custom questions | Done |
| Love letters: 6 kinds, envelope and paper reading view, typewriter, drafts, photos, voice recording or upload, favourites, gated secret letter | Done |
| Photobooth: camera on request, 3-second countdown ×4, filters, frames, stickers, caption, PNG download, save to gallery only after confirmation | Done |
| Timeline: constellation line, scroll reveal, categories, photo/video link/voice note, CRUD | Done |
| Jar of reasons: animated jar, unfold reveal, unread tracking per person, favourites, contributor, counter toward 365 | Done |
| Soundtrack: vinyl, in-app Spotify/YouTube embeds, external links, memory notes, favourites | Done |
| Future together: 6 categories, target dates, notes, completion with live sync, progress ring | Done |
| Time capsule: unlock date, optional photo, confirmation, live countdown, sealed by the database | Done |
| Secret corner: moon (5 taps), 7 hidden stars, game reward, hidden-memory tap, hidden surprises per secret | Done |
| Settings: names, universe name, start date, invite, animation and music toggles, replay intro, demo content, password, sign out | Done |
| Auth: password and email-link sign-in, no public sign-up, invite flow, protected routes, session refresh | Done |
| Database: migrations, constraints, indexes, RLS on every table, storage policies, realtime publication, seed questions, demo generator | Done |
| Preview mode: works with no backend, clearly labelled, never claims server persistence | Done |
| Docs: README, SETUP_GUIDE, DEPLOYMENT_GUIDE, this file | Done |

## Test results (7 Nov 2026)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, 0 errors |
| `npm run lint` | Pass, 0 warnings |
| `npm test` (Vitest) | 20/20 passed: time maths, anniversary countdown, game scoring, music embeds, photo filters |
| `npm run build` | Pass, all 20 routes + middleware |
| `npm run test:e2e` (Playwright) | 12/12 passed (6 journeys × desktop Chrome and Pixel 7): intro → universe, every route renders, reasons persist across reload, bucket item completion, capsule stays sealed, moon secret |
| `npm run test:db` (Postgres 16, Supabase auth/storage stubbed) | 26/26 checks passed, listed below |

Database checks: relationship creation with demo data; invite and acceptance; an outsider sees nothing and gets no invite; room creation; joining; ready gating; **partner's answer hidden before reveal**; partner progress visible without the answer; advancing before reveal refused; reveal after both answer; matching scores; duplicate answer refused; double "Next" advances once; direct score writes blocked; direct answer inserts blocked; mismatched round; finish; rematch is idempotent; prediction scoring for Who knows whom better; **capsule hidden from author and partner**; sealed capsule listed without content; capsule unlock date can't be changed; past unlock dates refused; drafts hidden from partner; secret letter locked, then unlocked; author can't be spoofed; third member refused.

## Needs your credentials (not testable here)

- **Live two-device play over Supabase Realtime.** The database logic is tested. Run this checklist on two phones once deployed:
  1. Phone A creates a room. Phone B sees it under “Games waiting for you” within a few seconds.
  2. Both ready → round 1 appears on both.
  3. A answers → A sees “Waiting for…”, B's screen gives no hint of A's choice.
  4. B answers → both reveal together.
  5. Turn on aeroplane mode on B mid-round, then off → the room catches up (on reconnect, focus, or within 15 seconds).
  6. Finish → both see results. **Play again** on one phone shows **Join the rematch** on the other.
- **Invite email delivery**, which depends on the Supabase email templates (SETUP_GUIDE step 3).
- **Storage uploads and signed URLs** against a real bucket.

## Known limitations

- Trivia correct answers are readable by a signed-in member through the API. It doesn't affect partner-answer privacy. Move correct answers into a private table if you want cheat-proof trivia.
- Time-capsule titles and unlock dates are visible to both people by design. Messages and photos are sealed.
- The free map uses OpenStreetMap tiles tinted with CSS. For heavy use, add a Mapbox token (OSM's tile policy asks for light use only).
- Preview mode stores photos as compressed data in browser storage (about 5 MB total). Use Supabase for real photos.
- The photobooth uses the front camera. There's no camera switcher.
- Hidden-star progress in the Secret corner is remembered per device. The unlock itself is saved to the database.
- No push notifications (for example, when a capsule opens or your partner starts a game).

## Ideas for later

Push notifications through Supabase Edge Functions; a shared photo album page; an anniversary-day surprise mode that unlocks automatically on 16 November; exporting everything as a printable book.
