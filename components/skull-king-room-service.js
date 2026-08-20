"use client";

import { createRoomPoll } from "../lib/room-poll.js";

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
    // Pauses on hidden tabs and backs off while the room is quiet.
    // See lib/room-poll.js for why 1.2s forever was expensive.
    return createRoomPoll({
      load: () => SkullKingRoomService.load(roomCode, token),
      onState: handler,
    });
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
