import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Catan and Monopoly reach their rooms only through the server's room routes.
// A browser that holds a database client could read and write the room tables
// directly, so neither service may build one or name those tables.
const services = [
  ["Catan", "../components/catan-room-service.js"],
  ["Monopoly", "../monopoly/src/roomService.ts"],
];

for (const [name, path] of services) {
  test(`${name}'s room service has no database client and names no room table`, () => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    for (const forbidden of ["getConfiguredSupabaseClient", "isSupabaseConfigured", "supabase.from", "@supabase", "catan_rooms", "monopoly_rooms", "supabase-room-sync"]) {
      assert.equal(source.includes(forbidden), false, `${name} service mentions ${forbidden}`);
    }
    assert.match(source, /engine-room-service/, `${name} uses the engine room service`);
  });
}

test("no browser-side code anywhere builds a database client for room state", () => {
  const files = [
    "../components/catan-room-service.js",
    "../components/engine-room-service.js",
    "../lib/use-engine-room.js",
    "../monopoly/src/roomService.ts",
    "../monopoly/src/main.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(/createClient\(|getConfiguredSupabaseClient/.test(source), false, `${file} builds a database client`);
  }
});
