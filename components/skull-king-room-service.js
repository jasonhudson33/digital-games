"use client";

export const SkullKingRoomService = {
  async create(name) {
    return postJson("/api/skull-king/rooms", { name });
  },

  async join(roomCode, name) {
    return postJson(`/api/skull-king/rooms/${normalizeCode(roomCode)}`, { action: "join", name });
  },

  async load(roomCode, token) {
    const response = await fetch(
      `/api/skull-king/rooms/${normalizeCode(roomCode)}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || "Could not load the room.");
    return payload.state;
  },

  async action(roomCode, token, action, values = {}) {
    const payload = await postJson(`/api/skull-king/rooms/${normalizeCode(roomCode)}`, {
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
        const state = await SkullKingRoomService.load(roomCode, token);
        if (!stopped && state.updatedAt > lastUpdatedAt) {
          lastUpdatedAt = state.updatedAt;
          handler(state);
        }
      } catch {
        // A temporary polling failure should not eject a player from the room.
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
  const payload = await readJsonResponse(response);
  if (!response.ok) throw new Error(payload.error || "The room could not be updated.");
  return payload;
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`The room server returned an unexpected response (${response.status}). Please try again.`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`The room server returned invalid data (${response.status}). Please try again.`);
  }
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
