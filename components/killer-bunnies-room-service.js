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
    // Pauses on hidden tabs and backs off while the room is quiet.
    // See lib/room-poll.js for why 1.2s forever was expensive.
    return createRoomPoll({
      load: () => KillerBunniesRoomService.load(roomCode, token),
      onState: handler,
    });
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
