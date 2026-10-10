"use client";

import { ROOM_CODE_ALPHABET, randomString } from "../lib/random";
import { subscribeToRoomState } from "../lib/room-sync.js";
import { asRoomError, isOffline, readCachedRoom, writeCachedRoom } from "../lib/room-cache";
import { migrateCatanRoomState } from "./catan-state-migrations.js";

const channelName = "catan-room-updates";

/**
 * Catan rooms are read and written only through /api/catan/rooms/<code>. The
 * browser holds no database client, and other players' changes arrive by
 * polling that route (see lib/room-sync.js).
 */
export const CatanRoomService = {
  async createCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = randomString(5, ROOM_CODE_ALPHABET);
      if (!(await CatanRoomService.load(code))) return code;
    }
    throw new Error("Could not create a unique room code. Try again.");
  },

  async save(state) {
    const next = migrateCatanRoomState(state);
    await saveLocalRoom(next);
    cacheRoom(next);
    return next;
  },

  async update(roomCode, updater) {
    const code = roomCode.trim().toUpperCase();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = await loadRoomOrCache(code, loadLocalRoom, loadCachedRoom);
      if (!current) return null;
      const updated = updater(current);
      if (updated === current) return current;
      const next = migrateCatanRoomState({ ...updated, updatedAt: Math.max(Date.now(), current.updatedAt + 1) });
      const saved = await saveLocalRoom(next, current.updatedAt);
      if (saved) {
        cacheRoom(next);
        return next;
      }
    }
    throw new Error("The room changed while this action was being saved. Please try again.");
  },

  async load(roomCode) {
    const code = roomCode.trim().toUpperCase();
    if (!code) return null;
    return await loadRoomOrCache(code, loadLocalRoom, loadCachedRoom);
  },

  subscribe(roomCode, handler) {
    return subscribeToRoomState({
      roomCode,
      broadcastName: channelName,
      load: (code) => CatanRoomService.load(code),
      migrate: migrateCatanRoomState,
      handler,
    });
  },
};

function loadCachedRoom(code) {
  return readCachedRoom(`catan:${code}`, (state) => migrateCatanRoomState(state));
}

function cacheRoom(state) {
  writeCachedRoom(`catan:${state.roomCode}`, state);
  if (!("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(state);
  channel.close();
}

async function saveLocalRoom(state, expectedUpdatedAt) {
  const response = await fetch(`/api/catan/rooms/${state.roomCode}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, expectedUpdatedAt }),
  });
  if (response.status === 409) return false;
  if (!response.ok) throw new Error("Could not save the Catan room.");
  return true;
}

async function loadLocalRoom(code) {
  try {
    const response = await fetch(`/api/catan/rooms/${code}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.state ? migrateCatanRoomState(data.state) : null;
  } catch {
    return null;
  }
}

/**
 * The server copy, or the local mirror when the server cannot be reached.
 *
 * Falling back on an offline error is what lets a dropped connection keep a
 * game playable. Rethrowing when there is no mirror is what stops "your wifi
 * died" being reported as "that room does not exist".
 */
async function loadRoomOrCache(code, fetchRoom, readCache) {
  try {
    return (await fetchRoom(code)) ?? readCache(code);
  } catch (error) {
    if (!isOffline(error)) throw error;
    const cached = readCache(code);
    if (cached) return cached;
    throw error;
  }
}
