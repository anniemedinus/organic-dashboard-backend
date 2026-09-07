-- Run this once in Supabase: Project > SQL Editor > New query > paste > Run

create table if not exists public.kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.kv_store enable row level security;

-- Simple setup: anyone with the anon (publishable) key can read and write.
-- The password gate on /dashboard is the only thing stopping casual edits —
-- this is fine for an internal team tool, not a bank. If you later want the
-- report route to be read-only at the database level too, tell Claude and
-- we can split this into separate read/write keys.
create policy "anon can read" on public.kv_store
  for select using (true);

create policy "anon can write" on public.kv_store
  for insert with check (true);

create policy "anon can update" on public.kv_store
  for update using (true);
