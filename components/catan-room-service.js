"use client";

import { getConfiguredSupabaseClient, subscribeToRoomState } from "../lib/supabase-room-sync";
import { migrateCatanRoomState } from "./catan-state-migrations.js";

const channelName = "catan-room-updates";

const supabase = getConfiguredSupabaseClient();
export const isCatanOnlineSyncEnabled = Boolean(supabase);

export const CatanRoomService = {
  async createCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
      if (!(await CatanRoomService.load(code))) return code;
    }
    throw new Error("Could not create a unique room code. Try again.");
  },

  async save(state) {
    const next = migrateCatanRoomState(state);
    if (supabase) {
      const { error } = await supabase.from("catan_rooms").upsert({
        code: next.roomCode,
        state: next,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      await saveLocalRoom(next);
    }
    cacheRoom(next);
    return next;
  },

  async update(roomCode, updater) {
    const code = roomCode.trim().toUpperCase();
    if (!supabase) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = (await loadLocalRoom(code)) ?? loadCachedRoom(code);
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
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { data: loaded, error: loadError } = await supabase
        .from("catan_rooms")
        .select("state")
        .eq("code", code)
        .maybeSingle();
      if (loadError) throw loadError;
      if (!loaded?.state) return null;
      const current = migrateCatanRoomState(loaded.state);
      const updated = updater(current);
      if (updated === current) return current;
      const next = migrateCatanRoomState({ ...updated, updatedAt: Math.max(Date.now(), current.updatedAt + 1) });
      const { data: saved, error: saveError } = await supabase
        .from("catan_rooms")
        .update({ state: next, updated_at: new Date().toISOString() })
        .eq("code", code)
        .eq("state->>updatedAt", String(current.updatedAt))
        .select("state")
        .maybeSingle();
      if (saveError) throw saveError;
      if (saved?.state) {
        const normalized = migrateCatanRoomState(saved.state);
        cacheRoom(normalized);
        return normalized;
      }
    }
    throw new Error("The room changed while this action was being saved. Please try again.");
  },

  async load(roomCode) {
    const code = roomCode.trim().toUpperCase();
    if (!code) return null;
    if (supabase) {
      const { data, error } = await supabase.from("catan_rooms").select("state").eq("code", code).maybeSingle();
      if (error) throw error;
      return data?.state ? migrateCatanRoomState(data.state) : null;
    }
    return (await loadLocalRoom(code)) ?? loadCachedRoom(code);
  },

  subscribe(roomCode, handler) {
    return subscribeToRoomState({
      supabase,
      roomCode,
      table: "catan_rooms",
      channelPrefix: "catan",
      broadcastName: channelName,
      load: (code) => CatanRoomService.load(code),
      migrate: migrateCatanRoomState,
      handler,
    });
  },
};

function loadCachedRoom(code) {
  const cached = localStorage.getItem(`catan:${code}`);
  return cached ? migrateCatanRoomState(JSON.parse(cached)) : null;
}

function cacheRoom(state) {
  localStorage.setItem(`catan:${state.roomCode}`, JSON.stringify(state));
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
