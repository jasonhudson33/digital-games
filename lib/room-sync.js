import { createRoomPoll } from "./room-poll.js";

/**
 * How a game that keeps whole-state rooms (Catan, Monopoly) hears about other
 * players' changes.
 *
 * Two channels feed one handler: a poll of the game's room route (paused on
 * hidden tabs and backing off while the room is quiet, see room-poll.js) and a
 * BroadcastChannel that shares updates between tabs of one browser at once. A
 * state whose `updatedAt` is not newer than the last one delivered is dropped,
 * whichever channel it came on.
 *
 * Nothing here talks to the database: the route behind `load` does.
 *
 * @template {{ roomCode: string, updatedAt: number }} T
 * @param {Object} options
 * @param {string} options.roomCode
 * @param {string} options.broadcastName         channel name shared by tabs of this game
 * @param {(roomCode: string) => Promise<T | null>} options.load
 * @param {(state: any) => T} [options.migrate]   normalizes a state from either channel
 * @param {(state: T) => void} options.handler
 * @param {number} [options.pollInterval]
 * @param {any} [options.env]                     injectable clock, for tests (see room-poll.js)
 * @param {(name: string) => any} [options.createChannel] injectable BroadcastChannel factory
 * @returns {() => void} stop
 */
export function subscribeToRoomState({
  roomCode,
  broadcastName,
  load,
  migrate = (state) => state,
  handler,
  pollInterval = 1200,
  env,
  createChannel = defaultChannel,
}) {
  const code = roomCode.trim().toUpperCase();
  const channel = createChannel(broadcastName);
  let lastSeen = 0;

  /** @param {any} state */
  const deliver = (state) => {
    const next = migrate(state);
    if (Number(next.updatedAt) <= lastSeen) return;
    lastSeen = Number(next.updatedAt);
    handler(next);
  };

  channel?.addEventListener("message", (/** @type {any} */ event) => {
    if (event.data?.roomCode === code) deliver(event.data);
  });

  const stopPoll = createRoomPoll({
    load: () => load(code),
    onState: deliver,
    baseInterval: pollInterval,
    ...(env ? { env } : {}),
  });

  return () => {
    stopPoll();
    channel?.close();
  };
}

/** @param {string} name */
function defaultChannel(name) {
  return typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(name) : null;
}
