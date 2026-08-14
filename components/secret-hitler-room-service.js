"use client";

export const SecretHitlerRoomService = {
  create(name) {
    return postJson("/api/secret-hitler/rooms", { name });
  },
  join(roomCode, name) {
    return postJson(`/api/secret-hitler/rooms/${normalizeCode(roomCode)}`, { action: "join", name });
  },
  async load(roomCode, token) {
    const response = await fetch(`/api/secret-hitler/rooms/${normalizeCode(roomCode)}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load the room.");
    return payload.state;
  },
  async action(roomCode, token, action, values = {}) {
    const payload = await postJson(`/api/secret-hitler/rooms/${normalizeCode(roomCode)}`, { ...values, action, token });
    return payload.state;
  },
  subscribe(roomCode, token, handler) {
    let stopped = false;
    let lastUpdatedAt = 0;
    const poll = async () => {
      try {
        const state = await SecretHitlerRoomService.load(roomCode, token);
        if (!stopped && state.updatedAt > lastUpdatedAt) {
          lastUpdatedAt = state.updatedAt;
          handler(state);
        }
      } catch { /* transient room polling failures are harmless */ }
    };
    void poll();
    const interval = window.setInterval(poll, 1200);
    return () => { stopped = true; window.clearInterval(interval); };
  },
};

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The room could not be updated.");
  return payload;
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
