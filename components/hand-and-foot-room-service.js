"use client";

export const HandFootRoomService = {
  async create(name) {
    return postJson("/api/hand-and-foot/rooms", { name });
  },

  async join(roomCode, name) {
    return postJson(`/api/hand-and-foot/rooms/${normalizeCode(roomCode)}`, { action: "join", name });
  },

  async load(roomCode, token) {
    const response = await fetch(
      `/api/hand-and-foot/rooms/${normalizeCode(roomCode)}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load the room.");
    return payload.state;
  },

  async action(roomCode, token, action, values = {}) {
    const payload = await postJson(`/api/hand-and-foot/rooms/${normalizeCode(roomCode)}`, {
      ...values,
      action,
      token,
    });
    return payload.state;
  },

  subscribe(roomCode, token, handler) {
    let stopped = false;
    let lastUpdatedAt = 0;
    const poll = async () => {
      try {
        const state = await HandFootRoomService.load(roomCode, token);
        if (!stopped && state.updatedAt > lastUpdatedAt) {
          lastUpdatedAt = state.updatedAt;
          handler(state);
        }
      } catch {
        // Temporary polling failures should not remove a player from the room.
      }
    };
    void poll();
    const intervalId = window.setInterval(poll, 1200);
    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
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
