-- Optimistic concurrency for the server-authoritative rooms.
--
-- Room actions load the room, mutate it, and write it back whole. Without a
-- version to check against, two overlapping requests both wrote a room built
-- from the same starting state and the later write erased the earlier one:
-- two players could claim the same seat, and a play landing at the same moment
-- as a pass lost one of them.
--
-- The server now updates only where `version` still matches what it read, and
-- the API retries the action when it does not.

alter table public.server_game_rooms
  add column if not exists version bigint not null default 0;

comment on column public.server_game_rooms.version is
  'Incremented on every write. A conditional update on this column is what makes room mutations safe against concurrent requests.';
