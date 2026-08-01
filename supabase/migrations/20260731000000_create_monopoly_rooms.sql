create table if not exists public.monopoly_rooms (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.monopoly_rooms enable row level security;

drop policy if exists "monopoly rooms are readable" on public.monopoly_rooms;
create policy "monopoly rooms are readable"
on public.monopoly_rooms for select
to anon, authenticated
using (true);

drop policy if exists "monopoly rooms can be created" on public.monopoly_rooms;
create policy "monopoly rooms can be created"
on public.monopoly_rooms for insert
to anon, authenticated
with check (true);

drop policy if exists "monopoly rooms can be updated" on public.monopoly_rooms;
create policy "monopoly rooms can be updated"
on public.monopoly_rooms for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.monopoly_rooms to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.monopoly_rooms;
exception
  when duplicate_object then null;
end $$;
