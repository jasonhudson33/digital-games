create table if not exists public.catan_rooms (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.catan_rooms enable row level security;

drop policy if exists "catan rooms are readable" on public.catan_rooms;
create policy "catan rooms are readable"
on public.catan_rooms for select
to anon, authenticated
using (true);

drop policy if exists "catan rooms can be created" on public.catan_rooms;
create policy "catan rooms can be created"
on public.catan_rooms for insert
to anon, authenticated
with check (true);

drop policy if exists "catan rooms can be updated" on public.catan_rooms;
create policy "catan rooms can be updated"
on public.catan_rooms for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.catan_rooms to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.catan_rooms;
exception
  when duplicate_object then null;
end $$;
