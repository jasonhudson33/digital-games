"use client";

export const KillerBunniesRoomService = {
  async create(name) {
    return postJson("/api/killer-bunnies/rooms", { name });
  },
  async join(roomCode, name) {
    return postJson(`/api/killer-bunnies/rooms/${normalize(roomCode)}`, { action: "join", name });
  },
  async load(roomCode, token) {
    const response = await fetch(`/api/killer-bunnies/rooms/${normalize(roomCode)}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || "Could not load the room.");
    return payload.state;
  },
  async action(roomCode, token, action, values = {}) {
    const payload = await postJson(`/api/killer-bunnies/rooms/${normalize(roomCode)}`, { ...values, action, token });
    return payload.state;
  },
  subscribe(roomCode, token, handler) {
    let stopped = false;
    let lastUpdatedAt = 0;
    const poll = async () => {
      try {
        const state = await KillerBunniesRoomService.load(roomCode, token);
        if (!stopped && state.updatedAt > lastUpdatedAt) {
          lastUpdatedAt = state.updatedAt;
          handler(state);
        }
      } catch {}
    };
    void poll();
    const interval = window.setInterval(poll, 1200);
    return () => { stopped = true; window.clearInterval(interval); };
  },
};

async function postJson(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.error || "The room could not be updated.");
  return payload;
}

async function readJson(response) {
  if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error(`Unexpected room response (${response.status}).`);
  return response.json();
}

function normalize(code) { return String(code || "").trim().toUpperCase(); }
