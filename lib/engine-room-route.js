import { NextResponse } from "next/server.js";

import { handleApi, noStoreHeaders } from "./api.js";
import { SEAT_TOKEN_HEADER } from "./room-seats.js";

/**
 * Route handlers for an engine room (see engine-room.js).
 *
 *   POST /api/<game>/rooms          { name }                   create
 *   GET  /api/<game>/rooms/<code>   X-Seat-Token               this seat's view
 *   POST /api/<game>/rooms/<code>   { action, args?, name? }   join, move, computerStep
 *
 * There is deliberately no PUT: a client cannot replace the game.
 *
 * @param {ReturnType<typeof import("./engine-room.js").createEngineRoom>} room
 */
export function createEngineRoomRoutes(room) {
  /** @param {Request} request */
  const readBody = async (request) => {
    try {
      return await request.json();
    } catch {
      return null;
    }
  };

  /** @param {Request} request */
  const tokenOf = (request) => request.headers.get(SEAT_TOKEN_HEADER) || "";

  const badBody = () =>
    NextResponse.json({ error: "Could not read the request body." }, { status: 400, headers: noStoreHeaders() });

  return {
    collection: {
      /** @param {Request} request */
      async POST(request) {
        const body = await readBody(request);
        if (!body || typeof body !== "object") return badBody();
        return handleApi(() => room.create({ name: body.name }));
      },
    },

    item: {
      /**
       * @param {Request} request
       * @param {{ params: Promise<{ code: string }> }} context
       */
      async GET(request, context) {
        const { code } = await context.params;
        return handleApi(() => room.get({ roomCode: code, token: tokenOf(request) }));
      },

      /**
       * @param {Request} request
       * @param {{ params: Promise<{ code: string }> }} context
       */
      async POST(request, context) {
        const { code } = await context.params;
        const body = await readBody(request);
        if (!body || typeof body !== "object") return badBody();
        const action = typeof body.action === "string" ? body.action : "";
        const token = tokenOf(request);
        if (action === "join") return handleApi(() => room.join({ roomCode: code, name: body.name }));
        if (action === "computerStep") return handleApi(() => room.computerStep({ roomCode: code, token }));
        return handleApi(() => room.act({ roomCode: code, token, action, args: body.args }));
      },
    },
  };
}
