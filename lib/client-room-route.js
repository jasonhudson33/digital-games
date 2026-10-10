import { adoptVersion, isRoomConflict } from "./supabase-server-room-store.js";
import {
  SEATS_KEY,
  SEAT_TOKEN_HEADER,
  addSeat,
  isLegacyRoom,
  joiningPlayerId,
  keepsOtherHumans,
  seatForToken,
  stripSeats,
} from "./room-seats.js";

/**
 * The GET/PUT pair behind every client-authoritative game room.
 *
 * Seventeen route files carried their own copy of this — the same normalizer,
 * the same room-code check, the same `expectedUpdatedAt` comparison and the
 * same two try/catch blocks, differing only in which store they imported and
 * how the error message named the game. Adding a game meant copying it again,
 * which is how the newest two arrived with the identical shape.
 *
 * Two things happen here that did not happen in the copies:
 *
 *   - the version the room was loaded at is carried onto the replacement, so
 *     the store's compare-and-set can reject a write that raced with another;
 *   - a storage conflict answers 409, the code the room services already know
 *     how to retry, rather than falling through to a blanket 500.
 *
 * Access: each seat holds a secret token (see room-seats.js). Once a game has
 * left the lobby, reads and writes need a seated player's token. A lobby may be
 * read by anyone with the code and joined by adding one human player; the join
 * answers with that seat's token. Rooms stored before tokens existed stay open
 * until they expire. Seated players still receive the whole state, so this
 * keeps strangers out but does not hide one seat's cards from another; that
 * needs server-side game engines.
 */
/**
 * @param {Object} options
 * @param {{ load: (code: string) => Promise<any>, save: (state: any) => Promise<void> }} options.store
 * @param {string} options.label
 * @param {(state: any) => boolean} [options.validate]
 * @param {boolean} [options.seatAccess] require seat tokens (default true)
 */
export function createClientRoomRoute({ store, label, validate, seatAccess = true }) {
  /** @param {unknown} code */
  const normalizeCode = (code) => String(code || "").trim().toUpperCase();

  return {
    /**
     * @param {Request} request
     * @param {{ params: Promise<{ code: string }> }} context
     */
    async GET(request, context) {
      try {
        const { code } = await context.params;
        const state = await store.load(normalizeCode(code));
        if (seatAccess && state && !isLegacyRoom(state) && state.phase !== "lobby") {
          if (!seatForToken(state, request.headers.get(SEAT_TOKEN_HEADER))) {
            return Response.json({ error: "This room has started. Only seated players can open it." }, { status: 403, headers: { "Cache-Control": "no-store" } });
          }
        }
        return Response.json({ state: stripSeats(state) }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : `Could not load the ${label} room.` },
          { status: 500, headers: { "Cache-Control": "no-store" } },
        );
      }
    },

    /**
     * @param {Request} request
     * @param {{ params: Promise<{ code: string }> }} context
     */
    async PUT(request, context) {
      try {
        const { code } = await context.params;
        const roomCode = normalizeCode(code);

        let body;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Could not read the request body." }, { status: 400 });
        }

        if (!body?.state || normalizeCode(body.state.roomCode) !== roomCode) {
          return Response.json({ error: `Invalid ${label} room state.` }, { status: 400 });
        }
        if (validate && !validate(body.state)) {
          return Response.json({ error: `Invalid ${label} room state.` }, { status: 400 });
        }

        const current = await store.load(roomCode);
        if (
          current &&
          body.expectedUpdatedAt != null &&
          Number(current.updatedAt) !== Number(body.expectedUpdatedAt)
        ) {
          return Response.json({ error: "Room state changed." }, { status: 409 });
        }

        const incoming = stripSeats(body.state);
        let seats = current?.[SEATS_KEY];
        let issued = null;

        if (seatAccess && !isLegacyRoom(current)) {
          const actingId = seatForToken(current, request.headers.get(SEAT_TOKEN_HEADER));
          if (actingId) {
            if (!keepsOtherHumans(current, incoming, actingId)) {
              return Response.json({ error: "A move cannot remove another player." }, { status: 403 });
            }
          } else {
            const joiner = joiningPlayerId(current, incoming);
            if (!joiner) {
              const status = request.headers.get(SEAT_TOKEN_HEADER) ? 403 : 401;
              return Response.json({ error: "You are not seated in this room." }, { status });
            }
            ({ seats, token: issued } = addSeat(seats, joiner));
          }
        } else if (seatAccess && !current) {
          const host = body.state.players?.[0];
          if (host?.id != null && !host.isComputer && !host.isBot) {
            ({ seats, token: issued } = addSeat({}, String(host.id)));
          }
        }

        const next = seats ? { ...incoming, [SEATS_KEY]: seats } : incoming;
        await store.save(adoptVersion(next, current));
        return Response.json(
          { state: incoming, ...(issued ? { seatToken: issued } : {}) },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        if (isRoomConflict(error)) {
          return Response.json({ error: "Room state changed." }, { status: 409 });
        }
        return Response.json(
          { error: error instanceof Error ? error.message : `Could not save the ${label} room.` },
          { status: 500 },
        );
      }
    },
  };
}
