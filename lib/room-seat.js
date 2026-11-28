/**
 * Remembering a player's seat in an online room, and getting back into it.
 *
 * Phones discard sleeping tabs. When the player comes back the page reloads,
 * and the first request often fires before the network is up. Several games
 * treated that failure as "your seat is gone" and deleted the token; Scum and
 * Secret Hitler also kept it in sessionStorage, which a discarded tab loses.
 * Either way a player in a started game was locked out.
 *
 * The rules here: the seat lives in localStorage; it is forgotten only when the
 * server says the room or the seat no longer exists (or the player leaves); and
 * anything else is retried until it works.
 */

// Messages the legacy room modules (lib/*-rooms.js) throw for a missing room or
// an unknown seat token. They all answer HTTP 400, so the text is the signal.
export const STALE_SEAT_MESSAGES = Object.freeze([
  "Room not found.",
  "Join the room before taking actions.",
]);

/** @param {string} key */
export function readSeatToken(key) {
  try {
    const token = localStorage.getItem(key) || sessionStorage.getItem(key) || "";
    if (token) {
      localStorage.setItem(key, token);
      sessionStorage.removeItem(key);
    }
    return token;
  } catch {
    return "";
  }
}

/** @param {string} key @param {string} token */
export function writeSeatToken(key, token) {
  try {
    localStorage.setItem(key, token);
    sessionStorage.removeItem(key);
  } catch {
    /* private mode: the seat still works until the tab closes */
  }
}

/** @param {string} key */
export function forgetSeatToken(key) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    /* nothing stored */
  }
}

/** An error standing for "the room answered, and there is nothing to resume". */
export class StaleSeatError extends Error {
  constructor(message = "Room not found.") {
    super(message);
    this.name = "StaleSeatError";
  }
}

/**
 * True when the server has said the room or the seat is gone, so the saved seat
 * should be forgotten. False for network failures, 5xx, conflicts and anything
 * else that may succeed on retry.
 * @param {unknown} error
 */
export function isStaleSeatError(error) {
  if (error instanceof StaleSeatError) return true;
  const status = /** @type {any} */ (error)?.status;
  if (status === 403 || status === 404) return true;
  const message = error instanceof Error ? error.message : "";
  return STALE_SEAT_MESSAGES.includes(message);
}

/**
 * @typedef {Object} ResumeEnv
 * @property {(fn: () => void, ms: number) => any} setTimeout
 * @property {(id: any) => void} clearTimeout
 * @property {(handler: () => void) => () => void} onWake  online / visible again
 */

/**
 * Load a saved room, retrying through temporary failures.
 *
 * `load` resolving to null/undefined means the room is gone (engine services
 * return null for a 404) and is treated as stale.
 *
 * @param {Object} options
 * @param {() => Promise<any>} options.load
 * @param {(state: any) => void} options.onState     loaded; stop
 * @param {(error: unknown) => void} options.onStale  room or seat gone; stop
 * @param {(error: unknown) => void} [options.onRetrying]  temporary failure; will retry
 * @param {number} [options.baseDelay=1000]
 * @param {number} [options.maxDelay=15000]
 * @param {ResumeEnv} [options.env]
 * @returns {() => void} cancel
 */
export function resumeRoom({
  load,
  onState,
  onStale,
  onRetrying = () => {},
  baseDelay = 1000,
  maxDelay = 15000,
  env = browserEnv(),
}) {
  let cancelled = false;
  let running = false;
  /** @type {any} */
  let timer = null;
  let delay = baseDelay;

  async function attempt() {
    if (cancelled || running) return;
    running = true;
    env.clearTimeout(timer);
    timer = null;
    try {
      const state = await load();
      if (cancelled) return;
      if (state === null || state === undefined) {
        stop();
        onStale(new StaleSeatError());
        return;
      }
      stop();
      onState(state);
    } catch (error) {
      if (cancelled) return;
      if (isStaleSeatError(error)) {
        stop();
        onStale(error);
        return;
      }
      onRetrying(error);
      timer = env.setTimeout(attempt, delay);
      delay = Math.min(delay * 2, maxDelay);
    } finally {
      running = false;
    }
  }

  function onWake() {
    if (cancelled || running) return;
    // The network or the tab just came back: try now, from a short delay again.
    delay = baseDelay;
    void attempt();
  }

  const removeWake = env.onWake(onWake);

  function stop() {
    cancelled = true;
    env.clearTimeout(timer);
    removeWake();
  }

  void attempt();
  return stop;
}

/** @returns {ResumeEnv} */
function browserEnv() {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    onWake(handler) {
      const onVisible = () => {
        if (!document.hidden) handler();
      };
      window.addEventListener("online", handler);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("online", handler);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
  };
}
