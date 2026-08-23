"use client";

import { subscribeToRoomState } from "../lib/supabase-room-sync";
import { asRoomError, isOffline, readCachedRoom, writeCachedRoom } from "../lib/room-cache";
import { ROOM_CODE_ALPHABET, randomString } from "../lib/random";

export function createCardGameRoomService(gameKey, gameName, { pollInterval = 1200, maxPollInterval } = {}) {
  const channelName = `${gameKey}-room-updates`;
  const service = {
    async createCode() {
      // For these games the room code is the whole of the access control: the
      // room API has no token, so anyone who can guess a code can read every
      // hand in it. Math.random is not a defence against guessing.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const code = randomString(5, ROOM_CODE_ALPHABET);
        if (!(await service.load(code))) return code;
      }
      throw new Error("Could not create a unique room code. Try again.");
    },
    async save(state) {
      const next = { ...state, updatedAt: state.updatedAt ?? Date.now() };
      const saved = await saveRoom(next);
      cacheRoom(saved);
      return saved;
    },
    async update(roomCode, updater) {
      const code = normalizeCode(roomCode);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = await loadRoomOrCache(code, loadRoom, loadCachedRoom);
        if (!current) return null;
        const updated = updater(current);
        if (!updated || updated === current) return current;
        const next = { ...updated, updatedAt: Math.max(Date.now(), Number(current.updatedAt || 0) + 1) };
        const saved = await saveRoom(next, current.updatedAt);
        if (saved) {
          cacheRoom(saved);
          return saved;
        }
      }
      throw new Error("The room changed while this move was being saved. Please try again.");
    },
    async load(roomCode) {
      const code = normalizeCode(roomCode);
      if (!code) return null;
      return await loadRoomOrCache(code, loadRoom, loadCachedRoom);
    },
    subscribe(roomCode, handler) {
      return subscribeToRoomState({
        supabase: null,
        roomCode,
        table: "server_game_rooms",
        channelPrefix: gameKey,
        broadcastName: channelName,
        load: (code) => service.load(code),
        migrate: (state) => state,
        handler,
        pollInterval,
        maxPollInterval,
      });
    },
  };

  function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  function loadCachedRoom(code) {
    return readCachedRoom(`${gameKey}:${code}`);
  }

  function cacheRoom(state) {
    writeCachedRoom(`${gameKey}:${state.roomCode}`, state);
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(state);
    channel.close();
  }

  async function saveRoom(state, expectedUpdatedAt) {
    const response = await fetch(`/api/${gameKey}/rooms/${state.roomCode}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, expectedUpdatedAt }),
    });
    if (response.status === 409) return null;
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || `Could not save the ${gameName} room.`);
    return payload.state;
  }

  async function loadRoom(code) {
    try {
      const response = await fetch(`/api/${gameKey}/rooms/${code}`, { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || `Could not load the ${gameName} room.`);
      return payload.state ?? null;
    } catch (error) {
      throw asRoomError(error);
    }
  }

  async function readJson(response) {
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error(`The room server returned an unexpected response (${response.status}).`);
    return response.json();
  }

  return service;
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
