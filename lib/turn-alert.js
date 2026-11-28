/**
 * A short chime (and a buzz, where phones support it) when it becomes your turn.
 *
 * `alert(key)` fires once per key: callers pass something that changes only when
 * a new turn arrives (room, round, turn number), so the many room refreshes
 * during one turn stay quiet. Nothing plays while the page is hidden or the
 * player has muted it, and the mute choice is shared by every game in this
 * browser.
 *
 * Browsers only allow sound after a user gesture; `unlock()` is wired to the
 * first tap or key press so the context is running by the first turn.
 */

export const TURN_SOUND_KEY = "digital-games:turn-sound";

/**
 * @param {Object} [options]
 * @param {{ getItem(k: string): string | null, setItem(k: string, v: string): void } | null} [options.storage]
 * @param {() => any} [options.createAudio]  returns an AudioContext-like object
 * @param {((ms: number) => any) | null} [options.vibrate]
 * @param {() => boolean} [options.isHidden]
 */
export function createTurnAlert({
  storage = safeLocalStorage(),
  createAudio = defaultAudio,
  vibrate = defaultVibrate(),
  isHidden = () => typeof document !== "undefined" && document.hidden,
} = {}) {
  let lastKey = null;
  /** @type {any} */
  let audio = null;

  function context() {
    if (!audio) audio = createAudio();
    return audio;
  }

  function isMuted() {
    try {
      return storage?.getItem(TURN_SOUND_KEY) === "off";
    } catch {
      return false;
    }
  }

  /** @param {boolean} muted */
  function setMuted(muted) {
    try {
      storage?.setItem(TURN_SOUND_KEY, muted ? "off" : "on");
    } catch {
      /* the choice lasts for this page only */
    }
  }

  function unlock() {
    const ctx = context();
    if (ctx?.state === "suspended") void ctx.resume?.();
  }

  /** @param {string | null | undefined} key */
  function alert(key) {
    if (!key || key === lastKey) return false;
    lastKey = key;
    if (isMuted() || isHidden()) return false;
    try {
      vibrate?.(60);
    } catch {
      /* not supported */
    }
    const ctx = context();
    if (!ctx) return true;
    try {
      if (ctx.state === "suspended") void ctx.resume?.();
      const start = ctx.currentTime;
      chime(ctx, 660, start);
      chime(ctx, 880, start + 0.11);
    } catch {
      /* audio unavailable: the vibration (if any) still happened */
    }
    return true;
  }

  return { alert, isMuted, setMuted, unlock };
}

/** One soft sine note with a quick attack and decay. */
function chime(ctx, frequency, at) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.18, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.11);
}

function defaultAudio() {
  if (typeof window === "undefined") return null;
  const Context = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
  return Context ? new Context() : null;
}

function defaultVibrate() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return null;
  return (ms) => navigator.vibrate(ms);
}

function safeLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
