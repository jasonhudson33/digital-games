import { adoptVersion, isRoomConflict } from "./supabase-server-room-store.js";

/**
 * The whole-state GET/PUT pair behind a game room whose browser computes state.
 * Catan and Monopoly are the only games left that use it; every other online
 * game runs on the server through lib/engine-room.js.
 *
 * Seventeen route files once carried their own copy of this — the same
 * normalizer, the same room-code check, the same `expectedUpdatedAt` comparison
 * and the same two try/catch blocks, differing only in which store they imported
 * and how the error message named the game.
 *
 * Two things happen here that did not happen in the copies:
 *
 *   - the version the room was loaded at is carried onto the replacement, so
 *     the store's compare-and-set can reject a write that raced with another;
 *   - a storage conflict answers 409, the code the room services already know
 *     how to retry, rather than falling through to a blanket 500.
 *
 * There is no access control beyond the room code: anyone holding it can read
 * and replace the room.
 */
/**
 * @param {Object} options
 * @param {{ load: (code: string) => Promise<any>, save: (state: any) => Promise<void> }} options.store
 * @param {string} options.label
 * @param {(state: any) => boolean} [options.validate]
 */
export function createClientRoomRoute({ store, label, validate }) {
  /** @param {unknown} code */
  const normalizeCode = (code) => String(code || "").trim().toUpperCase();

  return {
    /**
     * @param {Request} _request
     * @param {{ params: Promise<{ code: string }> }} context
     */
    async GET(_request, context) {
      try {
        const { code } = await context.params;
        const state = await store.load(normalizeCode(code));
        return Response.json({ state }, { headers: { "Cache-Control": "no-store" } });
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

        await store.save(adoptVersion(body.state, current));
        return Response.json({ state: body.state }, { headers: { "Cache-Control": "no-store" } });
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
