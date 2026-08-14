"use client";

import { subscribeToRoomState } from "../lib/supabase-room-sync";

const broadcastName = "life-room-updates";

export const LifeRoomService = {
  async createCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
      if (!(await this.load(code))) return code;
    }
    throw new Error("Could not create a unique room code. Try again.");
  },
  async save(state) {
    const saved = await saveRoom({ ...state, updatedAt: state.updatedAt || Date.now() });
    cacheRoom(saved);
    return saved;
  },
  async load(roomCode) {
    const code = normalize(roomCode);
    if (!code) return null;
    return (await loadRoom(code)) || loadCached(code);
  },
  async update(roomCode, updater) {
    const code = normalize(roomCode);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = (await loadRoom(code)) || loadCached(code);
      if (!current) return null;
      const updated = updater(current);
      if (!updated || updated === current) return current;
      const next = { ...updated, updatedAt: Math.max(Date.now(), Number(current.updatedAt || 0) + 1) };
      const saved = await saveRoom(next, current.updatedAt);
      if (saved) { cacheRoom(saved); return saved; }
    }
    throw new Error("The room changed while the turn was being saved. Try again.");
  },
  subscribe(roomCode, handler) {
    return subscribeToRoomState({ supabase: null, roomCode, table: "server_game_rooms", channelPrefix: "life", broadcastName, load: (code) => this.load(code), migrate: (state) => state, handler, pollInterval: 1200 });
  },
};

const normalize = (code) => String(code || "").trim().toUpperCase();
function loadCached(code) { const value = localStorage.getItem(`life:${code}`); return value ? JSON.parse(value) : null; }
function cacheRoom(state) { localStorage.setItem(`life:${state.roomCode}`, JSON.stringify(state)); if ("BroadcastChannel" in window) { const channel = new BroadcastChannel(broadcastName); channel.postMessage(state); channel.close(); } }
async function saveRoom(state, expectedUpdatedAt) { const response = await fetch(`/api/life/rooms/${state.roomCode}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, expectedUpdatedAt }) }); if (response.status === 409) return null; const payload = await readJson(response); if (!response.ok) throw new Error(payload.error || "Could not save the Life room."); return payload.state; }
async function loadRoom(code) { try { const response = await fetch(`/api/life/rooms/${code}`, { cache: "no-store" }); const payload = await readJson(response); if (!response.ok) throw new Error(payload.error || "Could not load the Life room."); return payload.state || null; } catch (error) { if (error instanceof TypeError) return null; throw error; } }
async function readJson(response) { if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error(`The room server returned an unexpected response (${response.status}).`); return response.json(); }
