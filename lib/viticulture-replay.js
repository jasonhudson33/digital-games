/*
 * Which new events a client should show as motion, and when.
 *
 * The server keeps the last few events in the room state and the client polls,
 * so it sees them in batches: nothing, one move, or three moves from three
 * players at once. This is the pure part of showing them — no timers, no DOM —
 * so the rules (never replay history, never animate a hidden tab, never let a
 * backlog play for a minute) can be tested without a browser.
 */

export const MAX_PLAYED = 12;

/** How long each kind of event holds the queue before the next one starts, in ms. */
const STEP = {
  "worker-placed": 600,
  "wake-chosen": 500,
  "season-changed": 1300,
  "year-ended": 0,
  "decision-needed": 0,
  "decision-made": 0,
  "season-passed": 0,
  "game-finished": 0,
  coins: 140,
  vp: 140,
  "cards-drawn": 220,
};
const DEFAULT_STEP = 260;

/**
 * @param {{ lastSeq: number | null | undefined, events: Array<{ seq: number, type: string }> | undefined,
 *           hidden?: boolean, reduced?: boolean, maxPlayed?: number }} input
 * @returns {{ play: Array<{ seq: number, type: string }>, nextSeq: number }}
 */
export function planReplay({ lastSeq, events, hidden = false, reduced = false, maxPlayed = MAX_PLAYED }) {
  const list = Array.isArray(events) ? events : [];
  const newest = list.length ? list[list.length - 1].seq : Math.max(0, Number(lastSeq) || 0);

  // First load, or a rejoin: show the present, not the past.
  if (lastSeq === null || lastSeq === undefined) return { play: [], nextSeq: newest };

  const fresh = list.filter((event) => event.seq > lastSeq);
  if (!fresh.length) return { play: [], nextSeq: Math.max(lastSeq, newest) };

  // The list is capped, so a long absence can leave a gap; the state is already right.
  const gap = list[0].seq > lastSeq + 1;
  if (gap || hidden || reduced) return { play: [], nextSeq: newest };

  return { play: fresh.slice(-maxPlayed), nextSeq: newest };
}

/**
 * The events in the order to show them, each with the delay (ms from now) at
 * which it starts. Quick events such as a coin floater start almost together;
 * a worker's flight and a season banner hold the queue.
 * @param {Array<{ seq: number, type: string }>} events
 */
export function timeline(events) {
  let at = 0;
  return events.map((event) => {
    const item = { event, delay: at };
    at += STEP[event.type] ?? DEFAULT_STEP;
    return item;
  });
}
