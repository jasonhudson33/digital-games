import assert from "node:assert/strict";
import test from "node:test";

import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";

test("local room stores isolate game namespaces and normalize room codes", async () => {
  const environment = {};
  const first = createSupabaseRoomStore({
    namespace: "test-one",
    memoryKey: "__testSupabaseRoomStoreOne",
    environment,
  });
  const second = createSupabaseRoomStore({
    namespace: "test-two",
    memoryKey: "__testSupabaseRoomStoreTwo",
    environment,
  });

  await first.save({ roomCode: "abc12", value: 1 });

  assert.equal((await first.load("ABC12")).value, 1);
  assert.equal(await second.load("abc12"), null);
});

test("local room storage expires rooms after the configured TTL", async () => {
  let currentTime = 1_000;
  const store = createSupabaseRoomStore({
    namespace: "expiry-test",
    memoryKey: "__testSupabaseRoomExpiry",
    environment: {},
    ttlSeconds: 10,
    now: () => currentTime,
  });

  await store.save({ roomCode: "SHORT", value: 1 });
  currentTime += 10_001;

  assert.equal(await store.load("short"), null);
});

test("Vercel room storage requires both server-side Supabase credentials", async () => {
  const store = createSupabaseRoomStore({
    namespace: "missing-config",
    memoryKey: "__testMissingSupabaseConfig",
    environment: { VERCEL: "1", NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" },
    missingSupabaseMessage: "Supabase service role is missing.",
  });

  await assert.rejects(store.load("ROOM1"), /Supabase service role is missing/);
});

test("Supabase storage upserts and reloads private room state with server credentials", async () => {
  const calls = [];
  const savedState = { roomCode: "ROOM1", players: [{ hand: ["AS"] }] };
  const client = createMockSupabaseClient(calls, savedState);
  let clientConfiguration;
  const store = createSupabaseRoomStore({
    namespace: "hand-foot",
    memoryKey: "__testConfiguredSupabaseStore",
    environment: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
    },
    now: () => Date.parse("2026-08-09T12:00:00.000Z"),
    supabaseClientFactory(url, key, options) {
      clientConfiguration = { url, key, options };
      return client;
    },
  });

  await store.save(savedState);
  const loaded = await store.load("room1");

  assert.deepEqual(loaded, savedState);
  assert.equal(clientConfiguration.url, "https://example.supabase.co");
  assert.equal(clientConfiguration.key, "server-only-key");
  assert.equal(clientConfiguration.options.auth.persistSession, false);
  assert.deepEqual(calls[0], {
    action: "upsert",
    table: "server_game_rooms",
    value: {
      game: "hand-foot",
      code: "ROOM1",
      state: savedState,
      updated_at: "2026-08-09T12:00:00.000Z",
      expires_at: "2026-08-10T12:00:00.000Z",
    },
    options: { onConflict: "game,code" },
  });
  assert.deepEqual(calls.at(-1), {
    action: "select",
    table: "server_game_rooms",
    columns: "state, expires_at",
    filters: [
      ["game", "hand-foot"],
      ["code", "ROOM1"],
    ],
  });
});

function createMockSupabaseClient(calls, state) {
  return {
    from(table) {
      return {
        async upsert(value, options) {
          calls.push({ action: "upsert", table, value, options });
          return { error: null };
        },
        select(columns) {
          const filters = [];
          return {
            eq(column, value) {
              filters.push([column, value]);
              return this;
            },
            async maybeSingle() {
              calls.push({ action: "select", table, columns, filters });
              return {
                data: {
                  state,
                  expires_at: "2026-08-10T12:00:00.000Z",
                },
                error: null,
              };
            },
          };
        },
        delete() {
          return {
            async lt(column, value) {
              calls.push({ action: "delete-expired", table, column, value });
              return { error: null };
            },
          };
        },
      };
    },
  };
}
