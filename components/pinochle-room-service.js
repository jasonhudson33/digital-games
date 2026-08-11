"use client";

export const PinochleRoomService = {
  async create(name) {
    return postJson("/api/pinochle/rooms", { name });
  },

  async join(roomCode, name) {
    return postJson(`/api/pinochle/rooms/${normalizeCode(roomCode)}`, { action: "join", name });
  },

  async load(roomCode, token) {
    const response = await fetch(
      `/api/pinochle/rooms/${normalizeCode(roomCode)}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || "Could not load the room.");
    return payload.state;
  },

  async action(roomCode, token, action, values = {}) {
    const payload = await postJson(`/api/pinochle/rooms/${normalizeCode(roomCode)}`, {
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
        const state = await PinochleRoomService.load(roomCode, token);
        if (!stopped && state.updatedAt > lastUpdatedAt) {
          lastUpdatedAt = state.updatedAt;
          handler(state);
        }
      } catch {
        // A temporary poll failure should not eject a player from the table.
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
    throw new Error(`The room server returned an unexpected response (${response.status}).`);
  }
  return response.json();
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
