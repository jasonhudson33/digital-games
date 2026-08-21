"use client";

/**
 * Shared room polling.
 *
 * Seven room services each had their own copy of `setInterval(poll, 1200)`, and
 * only seven-up-client checked whether the tab was visible. On a phone that
 * meant a backgrounded game woke the radio fifty times a minute, indefinitely —
 * across six players, roughly 300 requests a minute for a game nobody was
 * looking at. A battery cost, and on a hobby-tier plan a quota cost.
 *
 * Three behaviours, in one place:
 *
 *   1. Hidden tabs do not poll at all, and refetch once on becoming visible, so
 *      you never come back to a stale board.
 *   2. The interval backs off while nothing is changing (1.2s → 2.4s → 4.8s …
 *      up to `maxInterval`) and snaps back to `baseInterval` the moment the
 *      room does change. A game in play stays responsive; a lobby waiting on a
 *      sixth player goes quiet.
 *   3. `updatedAt` deduping lives here rather than being reimplemented by every
 *      caller.
 *
 * Timers are scheduled with setTimeout rather than setInterval so a slow
 * response cannot stack overlapping requests.
 *
 * @typedef {Object} PollEnv
 * @property {(fn: () => void, ms: number) => any} setTimeout
 * @property {(id: any) => void} clearTimeout
 * @property {() => boolean} isHidden
 * @property {(handler: () => void) => () => void} onVisibilityChange
 *
 * @param {Object}   options
 * @param {() => Promise<any>} options.load        fetches the current state
 * @param {(state: any) => void} options.onState   called only with newer state
 * @param {number}  [options.baseInterval=1200]
 * @param {number}  [options.maxInterval=15000]
 * @param {number}  [options.quietPolls=3]  unchanged polls before backing off
 * @param {PollEnv} [options.env]           injectable clock/visibility, for tests
 * @returns {() => void} stop
 */
export function createRoomPoll({
  load,
  onState,
  baseInterval = 1200,
  maxInterval = 15000,
  quietPolls = 3,
  env = browserEnv(),
}) {
  let stopped = false;
  /** @type {any} */
  let timer = null;
  let interval = baseInterval;
  let unchanged = 0;
  let lastUpdatedAt = 0;

  /** @param {number} delay */
  function schedule(delay) {
    if (stopped) return;
    env.clearTimeout(timer);
    timer = env.setTimeout(tick, delay);
  }

  async function tick() {
    if (stopped) return;

    // Nothing to do while nobody is looking; the visibility listener restarts us.
    if (env.isHidden()) {
      schedule(interval);
      return;
    }

    let changed = false;
    try {
      const state = await load();
      const updatedAt = Number(state?.updatedAt ?? 0);
      if (state && updatedAt > lastUpdatedAt) {
        lastUpdatedAt = updatedAt;
        changed = true;
        if (!stopped) onState(state);
      }
    } catch {
      // A temporary failure must not throw the player out of the room. It is
      // also not evidence the room is quiet, so the interval is left alone.
      schedule(interval);
      return;
    }

    if (changed) {
      unchanged = 0;
      interval = baseInterval;
    } else {
      unchanged += 1;
      if (unchanged >= quietPolls) {
        interval = Math.min(interval * 2, maxInterval);
        unchanged = 0;
      }
    }

    schedule(interval);
  }

  function onVisible() {
    if (stopped || env.isHidden()) return;
    // Back from a hidden tab: the board is probably stale, so fetch now and
    // treat it as an active room again.
    interval = baseInterval;
    unchanged = 0;
    schedule(0);
  }

  const removeVisibilityListener = env.onVisibilityChange(onVisible);
  schedule(0);

  return function stop() {
    stopped = true;
    env.clearTimeout(timer);
    removeVisibilityListener();
  };
}

/** @returns {PollEnv} */
function browserEnv() {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    isHidden: () => typeof document !== "undefined" && document.hidden,
    onVisibilityChange(handler) {
      document.addEventListener("visibilitychange", handler);
      return () => document.removeEventListener("visibilitychange", handler);
    },
  };
}
