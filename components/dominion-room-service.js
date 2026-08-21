"use client";

import { subscribeToRoomState } from "../lib/supabase-room-sync";

const channelName = "dominion-room-updates";

export const DominionRoomService = {
  async createCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
      if (!(await DominionRoomService.load(code))) return code;
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
      const current = (await loadRoom(code)) ?? loadCachedRoom(code);
      if (!current) return null;
      const updated = updater(current);
      if (!updated || updated === current) return current;
      const next = { ...updated, updatedAt: Math.max(Date.now(), Number(current.updatedAt || 0) + 1) };
      const saved = await saveRoom(next, current.updatedAt);
      if (saved) { cacheRoom(saved); return saved; }
    }
    throw new Error("The room changed while this action was being saved. Please try again.");
  },

  async load(roomCode) {
    const code = normalizeCode(roomCode);
    if (!code) return null;
    return (await loadRoom(code)) ?? loadCachedRoom(code);
  },

  subscribe(roomCode, handler) {
    return subscribeToRoomState({
      supabase: null,
      roomCode,
      table: "server_game_rooms",
      channelPrefix: "dominion",
      broadcastName: channelName,
      load: (code) => DominionRoomService.load(code),
      migrate: (state) => state,
      handler,
      pollInterval: 1200,
    });
  },
};

function normalizeCode(code) { return String(code || "").trim().toUpperCase(); }
function loadCachedRoom(code) {
  try {
    const cached = localStorage.getItem(`dominion:${code}`);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
}
function cacheRoom(state) {
  try { localStorage.setItem(`dominion:${state.roomCode}`, JSON.stringify(state)); } catch { /* room still works without cache */ }
  if (!("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(state);
  channel.close();
}
async function saveRoom(state, expectedUpdatedAt) {
  const response = await fetch(`/api/dominion/rooms/${state.roomCode}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, expectedUpdatedAt }),
  });
  if (response.status === 409) return null;
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.error || "Could not save the Dominion room.");
  return payload.state;
}
async function loadRoom(code) {
  try {
    const response = await fetch(`/api/dominion/rooms/${code}`, { cache: "no-store" });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Could not load the Dominion room.");
    return payload.state ?? null;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}
async function readJson(response) {
  if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error(`The room server returned an unexpected response (${response.status}).`);
  return response.json();
}
