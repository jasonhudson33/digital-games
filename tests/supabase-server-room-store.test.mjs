import assert from "node:assert/strict";
import test from "node:test";

import { createSupabaseRoomStore, isRoomConflict } from "../lib/supabase-server-room-store.js";

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

test("Supabase storage writes conditionally and reloads private room state with server credentials", async () => {
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
  // A room with no version yet is inserted, so a simultaneous create on the
  // same code collides on the primary key instead of silently overwriting.
  assert.deepEqual(calls[0], {
    action: "insert",
    table: "server_game_rooms",
    value: {
      game: "hand-foot",
      code: "ROOM1",
      version: 0,
      state: savedState,
      updated_at: "2026-08-09T12:00:00.000Z",
      expires_at: "2026-08-10T12:00:00.000Z",
    },
  });
  assert.deepEqual(calls.at(-1), {
    action: "select",
    table: "server_game_rooms",
    columns: "state, expires_at, version",
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
        async insert(value) {
          calls.push({ action: "insert", table, value });
          return { error: null };
        },
        update(value) {
          const filters = [];
          return {
            eq(column, filterValue) {
              filters.push([column, filterValue]);
              return this;
            },
            async select(columns) {
              calls.push({ action: "update", table, value, filters, columns });
              // One row matched: the version we wrote against was still current.
              return { data: [{ version: value.version }], error: null };
            },
          };
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
                  version: 7,
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

test("a room loaded from Supabase is written back with a version check", async () => {
  // The update must be scoped by the version it was read at. Without that
  // predicate two overlapping requests both wrote a whole room built from the
  // same starting state and the later write erased the earlier one.
  const calls = [];
  const savedState = { roomCode: "ROOM1", players: [{ hand: ["AS"] }] };
  const store = createSupabaseRoomStore({
    namespace: "hand-foot",
    memoryKey: "__testVersionedSupabaseStore",
    environment: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
    },
    now: () => Date.parse("2026-08-09T12:00:00.000Z"),
    supabaseClientFactory: () => createMockSupabaseClient(calls, savedState),
  });

  const loaded = await store.load("ROOM1");   // the mock reports version 7
  loaded.players[0].hand.push("KH");
  await store.save(loaded);

  const update = calls.find((call) => call.action === "update");
  assert.ok(update, "a loaded room is updated, never re-inserted");
  assert.equal(update.value.version, 8, "the version moves on by one");
  assert.deepEqual(update.filters, [
    ["game", "hand-foot"],
    ["code", "ROOM1"],
    ["version", 7],
  ], "the write is conditional on the version it was read at");
});

test("a conditional update that matches no row is reported as a conflict", async () => {
  const store = createSupabaseRoomStore({
    namespace: "hand-foot",
    memoryKey: "__testConflictSupabaseStore",
    environment: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
    },
    supabaseClientFactory: () => ({
      from: () => ({
        select: () => ({
          eq() { return this; },
          async maybeSingle() {
            return { data: { state: { roomCode: "ROOM1" }, expires_at: "2099-01-01T00:00:00.000Z", version: 3 }, error: null };
          },
        }),
        update: () => ({
          eq() { return this; },
          // Somebody else moved the version on first, so nothing matched.
          async select() { return { data: [], error: null }; },
        }),
      }),
    }),
  });

  const loaded = await store.load("ROOM1");
  await assert.rejects(() => store.save(loaded), isRoomConflict);
});
