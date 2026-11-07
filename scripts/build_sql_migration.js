const fs = require("fs");
const path = require("path");

const reasons = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "Our_Little_Universe_365_Reasons.json"), "utf8")
);

let sql = `-- Migration: Jar of 365 Reasons with Daily Rotation
-- Creates jar_reasons, jar_settings, jar_daily_history with RLS and seeds all 365 reasons

create table if not exists public.jar_reasons (
  id uuid primary key default gen_random_uuid(),
  sequence_number integer not null unique check (sequence_number between 1 and 365),
  reason_text text not null check (char_length(reason_text) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.jar_settings (
  id uuid primary key default gen_random_uuid(),
  start_date date not null default '2026-11-08',
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.jar_daily_history (
  id uuid primary key default gen_random_uuid(),
  display_date date not null unique,
  reason_id uuid not null references public.jar_reasons(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_jar_reasons_seq on public.jar_reasons(sequence_number);
create index if not exists idx_jar_daily_history_date on public.jar_daily_history(display_date);

-- Enable RLS
alter table public.jar_reasons enable row level security;
alter table public.jar_settings enable row level security;
alter table public.jar_daily_history enable row level security;

-- Policies: Authenticated users can read
drop policy if exists "Authenticated users can read jar_reasons" on public.jar_reasons;
create policy "Authenticated users can read jar_reasons"
  on public.jar_reasons for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read jar_settings" on public.jar_settings;
create policy "Authenticated users can read jar_settings"
  on public.jar_settings for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can update jar_settings" on public.jar_settings;
create policy "Authenticated users can update jar_settings"
  on public.jar_settings for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read jar_daily_history" on public.jar_daily_history;
create policy "Authenticated users can read jar_daily_history"
  on public.jar_daily_history for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert jar_daily_history" on public.jar_daily_history;
create policy "Authenticated users can insert jar_daily_history"
  on public.jar_daily_history for insert
  to authenticated
  with check (true);

-- Ensure Realtime publication includes jar tables
alter publication supabase_realtime add table public.jar_settings, public.jar_daily_history;

-- Seed default settings (Day 1 starts on 2026-11-08)
insert into public.jar_settings (start_date, timezone, is_active)
values ('2026-11-08', 'Asia/Kolkata', true)
on conflict do nothing;

-- Seed all 365 reasons idempotently
insert into public.jar_reasons (sequence_number, reason_text)
values
`;

const valueRows = reasons.map((r) => {
  const safeText = r.reason.replace(/'/g, "''");
  return `  (${r.day}, '${safeText}')`;
});

sql += valueRows.join(",\n") + `\non conflict (sequence_number) do update set reason_text = excluded.reason_text;\n`;

const outPath = path.join(__dirname, "..", "supabase", "migrations", "20261108000000_jar_of_365_reasons.sql");
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Generated SQL migration file at ${outPath} with ${reasons.length} reasons.`);

