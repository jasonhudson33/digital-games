-- Catan and Monopoly rooms now live only in public.server_game_rooms, which is
-- reachable through the app's room routes with the service role and by nobody
-- else. The two browser-facing tables below let anyone holding the public anon
-- key list every room, read every game and overwrite any of them, so they go.
--
-- DEPLOY ORDER: ship the app version that stops reading and writing these
-- tables first, let players reload, then run this migration. A browser still
-- running the old bundle will show "could not save the room" afterwards.
--
-- Dropping a table also removes its row-level-security policies, its grants and
-- its membership of the supabase_realtime publication, so nothing else is
-- needed. Rooms last 24 hours, so no data of value is lost. To roll back, deploy
-- the previous app version and re-run 20260731000000_create_monopoly_rooms.sql
-- and 20260804000000_create_catan_rooms.sql, which recreate the tables empty.

drop table if exists public.catan_rooms;
drop table if exists public.monopoly_rooms;
