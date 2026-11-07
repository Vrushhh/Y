# Setup guide

This takes you from an empty Supabase account to both of you signed in, with your own photos, letters and places.

## 1. Create the Supabase project

1. Go to https://supabase.com, create a project, and pick the region closest to you (for India, Mumbai).
2. Save the database password somewhere safe.
3. Open **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never share it)

Put them in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 2. Apply the migrations

**Option A, SQL editor (simplest).** In Supabase open **SQL Editor → New query**. Paste the whole of `supabase/migrations/20261101000000_schema.sql` and run it. Then do the same with `20261101000100_seed_and_demo.sql`. Run them in that order.

**Option B, Supabase CLI.**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migrations create every table, all Row Level Security policies, the game and capsule functions, the private `media` storage bucket and its policies, the Realtime subscriptions, and about 50 starter game questions.

To check it worked, open **Table Editor**. You should see `memories`, `game_rooms`, `time_capsules` and so on, each with a shield icon meaning RLS is on. **Storage** should show a private bucket called `media`.

## 3. Configure authentication

In **Authentication → Sign In / Providers**:

- Keep **Email** enabled.
- Turn **off** “Allow new users to sign up”. Only invited people can get in.
- Optionally turn off “Confirm email”. Invited users confirm by accepting the invite anyway.

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` for now, your Vercel URL later.
- **Redirect URLs:** add `http://localhost:3000/**` and later `https://your-domain/**`.

In **Authentication → Email Templates**, edit two templates so their links go through the app:

**Invite user.** Replace the link with:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings">Enter our universe</a>
```

**Magic Link.** Replace the link with:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/universe">Sign in</a>
```

Supabase's built-in email service is limited to a few emails per hour. That's enough for two people, but for reliability you can add your own SMTP provider under **Authentication → Emails → SMTP**.

## 4. Create the first account (you)

1. **Authentication → Users → Add user → Create new user.** Enter your email and a password, and tick **Auto Confirm User**.
2. Run `npm run dev`, open http://localhost:3000/login and sign in.
3. You'll see **Create our universe**. Check the name and start date (16 November 2025), add the name your partner should see, then create it. Labelled demo content is added so the pages aren't empty.

## 5. Invite the second person

1. Go to **Settings → Your person**, enter their email and press **Invite**.
2. If `SUPABASE_SERVICE_ROLE_KEY` is set, they get an email. The link signs them in and opens Settings, where they set a password.
3. Without the service key, the app still records the invite. Add them yourself under **Authentication → Users → Invite user** (or **Add user** with a password). They're joined to your universe automatically the first time they sign in.

From then on the universe is closed. The database refuses a third member.

## 6. Add your real content

Do this together. It's half the fun.

| What | Where | Tip |
| --- | --- | --- |
| Remove demo items | Settings → Demo content → Remove demo content | Or edit each one. Editing a demo item removes its “Demo” badge |
| Places | Memory map → tap the map or **Add memory** | Use **Pick on map** or **Use my location**. Add several photos per memory. Pick “Future destination” for dashed pins |
| Featured photo on the dashboard | Any memory with a photo | The most recent memory with a photo is featured |
| Letters | Letters → tap an envelope | **Save as draft** keeps it private. **Seal and share** shows it to both of you. Record a voice note right in the editor |
| Secret letter | Letters → Secret letter | Your partner can only open it after tapping the moon five times in the Secret corner |
| Timeline | Timeline → **Add a moment** | Photo, video link and voice note are all optional |
| Reasons | Reasons jar → **Add a reason** | No need for 365 on day one. Add one a day |
| Songs | Soundtrack → **Add a song** | Paste a Spotify or YouTube link and it plays inside the app (official embeds only, nothing is downloaded) |
| Plans | Future together → **Add a plan** | Ticking one off updates instantly on both phones |
| Time capsule | Time capsule → **Seal a message** | Try one that opens on 16 November 2027 |
| Hidden surprises | Secret corner → **Hide something** | Attach a message or photo to a secret. Your partner sees it only after finding it |
| Game questions | Date mode → **Add your own question** | Trivia and memory-challenge questions can have a correct answer and, for memory challenges, a photo |
| Intro music | `public/audio/intro.mp3` | Only use a track you have the rights to. It never autoplays |
| The intro line | `app/page.tsx`, the `MESSAGE` constant | Change it to your own words |

## 7. Play a game across two phones

1. Phone A: **Date mode** → choose a game → you land in the waiting room.
2. Phone B: open **Date mode**. The room appears under “Games waiting for you”. You can also send the link from the waiting room.
3. Both press **I’m ready**. Answer on each phone. Answers reveal together once both of you have locked in.

## Troubleshooting

- **“Sign-in isn’t set up yet”**: the env variables aren't loaded. Restart `npm run dev` after editing `.env.local`.
- **Sign-in link says it expired**: the email template link is wrong (step 3), or the link was opened twice. Request a new one.
- **Invited person sees “Create our universe”**: they signed in with a different email from the one invited. Invite that exact email.
- **Games don't update live**: check **Database → Publications → supabase_realtime** includes `game_rooms`, `game_players` and `game_rounds`. The room also refreshes every 15 seconds and whenever the tab comes back into focus.
- **Camera doesn't start**: browsers allow the camera only on `https://` or `localhost`.
