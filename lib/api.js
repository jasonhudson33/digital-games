import { NextResponse } from "next/server";

import { isRoomConflict } from "./supabase-server-room-store.js";

/**
 * How many times a room action is replayed when another request beat it to the
 * write. Each attempt re-reads the room, so the action re-decides on current
 * state rather than replaying a stale decision — a seat that was free on the
 * first pass and taken on the second correctly fails the second time.
 */
const CONFLICT_RETRIES = 4;

/** @param {() => Promise<any>} action */
export async function handleApi(action) {
  try {
    return NextResponse.json(await runWithRetry(action), {
      status: 200,
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: isRoomConflict(error) ? 409 : 400, headers: noStoreHeaders() }
    );
  }
}

/** @param {() => Promise<any>} action */
async function runWithRetry(action) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (!isRoomConflict(error) || attempt >= CONFLICT_RETRIES) throw error;
    }
  }
}

/**
 * @param {Request} request
 * @param {string} roomCode
 * @param {Record<string, (input: any) => Promise<any>>} handlers
 */
export async function handleRoomAction(request, roomCode, handlers) {
  let body;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON is a client error, not a crash. Parsing used to sit
    // outside the guard, so a truncated body produced a 500.
    return NextResponse.json(
      { error: "Could not read the request body." },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  // Object.hasOwn, not a bare lookup: `handlers[body.action]` resolves through
  // Object.prototype, so actions named "constructor", "toString", "valueOf",
  // "hasOwnProperty" or "isPrototypeOf" walked straight past `if (!handler)`
  // and were invoked as if they were real room actions.
  const action = typeof body?.action === "string" ? body.action : "";
  if (!Object.hasOwn(handlers, action)) {
    return NextResponse.json(
      { error: "Unknown room action." },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  return handleApi(async () => handlers[action]({ ...body, roomCode }));
}

export function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
