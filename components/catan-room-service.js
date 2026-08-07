"use client";

import { createClient } from "@supabase/supabase-js";
import { PROGRESS_DECKS } from "./catan-rules";

const channelName = "catan-room-updates";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
};

const supabase = getSupabase();
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
    const next = normalizeState(state);
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
        const next = normalizeState({ ...updated, updatedAt: Math.max(Date.now(), current.updatedAt + 1) });
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
      const current = normalizeState(loaded.state);
      const updated = updater(current);
      if (updated === current) return current;
      const next = normalizeState({ ...updated, updatedAt: Math.max(Date.now(), current.updatedAt + 1) });
      const { data: saved, error: saveError } = await supabase
        .from("catan_rooms")
        .update({ state: next, updated_at: new Date().toISOString() })
        .eq("code", code)
        .eq("state->>updatedAt", String(current.updatedAt))
        .select("state")
        .maybeSingle();
      if (saveError) throw saveError;
      if (saved?.state) {
        const normalized = normalizeState(saved.state);
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
      return data?.state ? normalizeState(data.state) : null;
    }
    return (await loadLocalRoom(code)) ?? loadCachedRoom(code);
  },

  subscribe(roomCode, handler) {
    const code = roomCode.trim().toUpperCase();
    const broadcastChannel = "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null;
    let lastSeen = 0;
    const deliver = (state) => {
      const remote = normalizeState(state);
      if (remote.updatedAt <= lastSeen) return;
      lastSeen = remote.updatedAt;
      handler(remote);
    };
    broadcastChannel?.addEventListener("message", (event) => {
      if (event.data?.roomCode === code) deliver(event.data);
    });
    const pollId = window.setInterval(() => {
      void CatanRoomService.load(code).then((remote) => remote && deliver(remote)).catch(() => undefined);
    }, 1500);
    const subscription = supabase
      ?.channel(`catan:${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "catan_rooms", filter: `code=eq.${code}` }, (payload) => {
        if (payload.new?.state) deliver(payload.new.state);
      })
      .subscribe();
    return () => {
      broadcastChannel?.close();
      window.clearInterval(pollId);
      if (subscription && supabase) void supabase.removeChannel(subscription);
    };
  },
};

function normalizeState(state) {
  const board = state.board
    ? {
        ...state.board,
        viewBoxHeight: state.boardVariant === "expanded"
          ? Math.max(780, Number(state.board.viewBoxHeight) || 0)
          : Number(state.board.viewBoxHeight) || 680,
      }
    : null;
  return {
    ...state,
    phase: state.phase ?? "lobby",
    ruleset: state.ruleset ?? "original",
    victoryTarget: state.victoryTarget ?? (state.ruleset === "cities-knights" ? 13 : state.ruleset === "seafarers" ? 14 : state.ruleset === "combined" ? 16 : 10),
    updatedAt: Number(state.updatedAt) || Date.now(),
    pendingSeven: state.pendingSeven ?? null,
    pendingGold: state.pendingGold ?? null,
    pendingTrade: state.pendingTrade
      ? { ...state.pendingTrade, declinedPlayerIds: state.pendingTrade.declinedPlayerIds ?? [] }
      : null,
    pendingDevelopment: state.pendingDevelopment ?? null,
    pendingCityLoss: state.pendingCityLoss ?? null,
    pendingProgressDiscard: state.pendingProgressDiscard ?? null,
    pairedTurn: state.pairedTurn ?? null,
    ports: state.ports ?? [],
    ships: state.ships ?? {},
    pirateTileId: state.pirateTileId ?? null,
    movedShipThisTurn: state.movedShipThisTurn ?? false,
    builtShipsThisTurn: state.builtShipsThisTurn ?? [],
    developmentDeck: state.developmentDeck ?? [],
    developmentCardPlayedThisTurn: state.developmentCardPlayedThisTurn ?? false,
    longestRoadPlayerId: state.longestRoadPlayerId ?? null,
    longestRouteLengths: state.longestRouteLengths ?? {},
    largestArmyPlayerId: state.largestArmyPlayerId ?? null,
    barbarianAlert: state.barbarianAlert ?? null,
    robberInactiveTileId: state.robberInactiveTileId ?? null,
    citiesKnights: state.citiesKnights
      ? {
          ...state.citiesKnights,
          attacks: state.citiesKnights.attacks ?? 0,
          knights: state.citiesKnights.knights ?? {},
          cityWalls: state.citiesKnights.cityWalls ?? {},
          promotedKnightIdsThisTurn: state.citiesKnights.promotedKnightIdsThisTurn ?? [],
          progressDecks: Object.fromEntries(Object.entries(PROGRESS_DECKS).map(([color, deck]) => [color, state.citiesKnights.progressDecks?.[color] ?? [...deck]])),
          improvements: Object.fromEntries((state.players ?? []).map((player) => [player.id, { trade: 0, politics: 0, science: 0, ...(state.citiesKnights.improvements?.[player.id] ?? {}) }])),
          metropolises: { trade: null, politics: null, science: null, ...(state.citiesKnights.metropolises ?? {}) },
        }
      : null,
    board,
    boardVariant: state.boardVariant ?? null,
    players: (state.players ?? []).map((player) => ({
      ...player,
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, paper: 0, cloth: 0, coin: 0, ...(player.resources ?? {}) },
      settledIslandIds: player.settledIslandIds ?? [],
      defenderPoints: player.defenderPoints ?? 0,
      hiddenVictoryPoints: player.hiddenVictoryPoints ?? 0,
      developmentCards: player.developmentCards ?? [],
      playedKnights: player.playedKnights ?? 0,
      progressCards: player.progressCards ?? [],
      progressVictoryPoints: player.progressVictoryPoints ?? 0,
    })),
  };
}

function loadCachedRoom(code) {
  const cached = localStorage.getItem(`catan:${code}`);
  return cached ? normalizeState(JSON.parse(cached)) : null;
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
    return data.state ? normalizeState(data.state) : null;
  } catch {
    return null;
  }
}
