import assert from "node:assert/strict";

import { createEngineRoom } from "../lib/engine-room.js";
import { createSupabaseRoomStore } from "../lib/supabase-server-room-store.js";

/**
 * A started room with `humans` seats, plus the stored game for comparison.
 * @param {any} adapter
 * @param {{ humans?: number, computers?: number, before?: (api: any) => Promise<void> }} [options]
 */
export async function startedRoom(adapter, { humans = 2, computers = 0, before } = {}) {
  const store = createSupabaseRoomStore({ namespace: `t-${adapter.label}`, memoryKey: `__t${Math.random()}`, environment: {} });
  const room = createEngineRoom({ store, adapter });
  const host = await room.create({ name: "Host" });
  const code = host.state.roomCode;
  const seats = [host];
  for (let i = 1; i < humans; i += 1) seats.push(await room.join({ roomCode: code, name: `P${i}` }));
  for (let i = 0; i < computers; i += 1) await room.act({ roomCode: code, token: host.token, action: "addComputer" });
  const api = { room, store, code, seats };
  if (before) await before(api);
  await room.act({ roomCode: code, token: host.token, action: "start" });
  return { ...api, raw: await store.load(code) };
}

/**
 * Assert none of `secretIds` appears as an id in `view`'s serialized form.
 * @param {any} view
 * @param {string[]} secretIds
 * @param {string} what
 */
export function assertNoneLeaked(view, secretIds, what) {
  const payload = JSON.stringify(view);
  for (const id of secretIds) assert.equal(payload.includes(`"${id}"`), false, `${what} ${id} leaked`);
}
