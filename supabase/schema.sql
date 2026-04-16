-- ============================================================
-- Loot Ledger — Supabase Schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================


-- ── Tables ────────────────────────────────────────────────────────────────────

create table campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  setting    text,
  created_at timestamp default now()
);

create table characters (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name        text not null
);

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name        text not null,
  date        date
);

create table items (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  session_id  uuid references sessions(id) on delete set null,
  name        text not null,
  true_name   text,
  rarity      text,
  quantity    integer default 1,
  value_gp    numeric default 0,
  assigned_to text,
  notes       text,
  flavor_text text,
  attuned     boolean default false,
  mystery     boolean default false,
  revealed    boolean default false,
  created_at  timestamp default now()
);

create table party_gold (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade unique,
  amount      numeric default 0
);


-- ── Indexes ───────────────────────────────────────────────────────────────────

create index characters_campaign_id_idx on characters (campaign_id);
create index sessions_campaign_id_idx   on sessions   (campaign_id);
create index items_campaign_id_idx      on items      (campaign_id);
create index items_session_id_idx       on items      (session_id);


-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Open policies — tighten once auth is added.

alter table campaigns  enable row level security;
alter table characters enable row level security;
alter table sessions   enable row level security;
alter table items      enable row level security;
alter table party_gold enable row level security;

create policy "public_all" on campaigns  for all using (true) with check (true);
create policy "public_all" on characters for all using (true) with check (true);
create policy "public_all" on sessions   for all using (true) with check (true);
create policy "public_all" on items      for all using (true) with check (true);
create policy "public_all" on party_gold for all using (true) with check (true);


-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enables live sync on items and party_gold for all connected clients.
-- You can also toggle these in the Supabase Dashboard → Database → Replication.

alter publication supabase_realtime add table items;
alter publication supabase_realtime add table party_gold;
