import { createRoomPoll } from "./room-poll.js";

/*
 * @supabase/supabase-js is loaded on demand.
 *
 * Thirteen room services import this module, but only Catan and Monopoly ever
 * construct a client — the other eleven use subscribeToRoomState and fall back
 * to polling. Importing the SDK at the top of this file put a 172 KB chunk on
 * sixteen game routes regardless, including every landing screen, which is the
 * one view nobody has a room on yet.
 *
 * Whether Supabase is configured is an environment question and stays
 * synchronous; only building the client needs the SDK.
 */
const clients = globalThis.__digitalGamesSupabaseClients || new Map();
globalThis.__digitalGamesSupabaseClients = clients;

let createClientPromise = null;

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

/** Synchronous, and does not pull in the SDK. */
export function isSupabaseConfigured() {
  return Boolean(credentials());
}

export async function getConfiguredSupabaseClient() {
  const creds = credentials();
  if (!creds) return null;
  const key = `${creds.url}:${creds.anonKey}`;
  if (clients.has(key)) return clients.get(key);

  createClientPromise ??= import("@supabase/supabase-js").then((m) => m.createClient);
  const createClient = await createClientPromise;
  if (!clients.has(key)) clients.set(key, createClient(creds.url, creds.anonKey));
  return clients.get(key);
}

export function subscribeToRoomState({
  roomCode,
  table,
  channelPrefix,
  broadcastName,
  load,
  migrate,
  handler,
  pollInterval = 1500,
  maxPollInterval,
}) {
  const code = roomCode.trim().toUpperCase();
  const broadcastChannel = "BroadcastChannel" in window ? new BroadcastChannel(broadcastName) : null;
  let lastSeen = 0;
  const deliver = (state) => {
    const remote = migrate(state);
    if (remote.updatedAt <= lastSeen) return;
    lastSeen = remote.updatedAt;
    handler(remote);
  };

  broadcastChannel?.addEventListener("message", (event) => {
    if (event.data?.roomCode === code) deliver(event.data);
  });
  // Realtime is the primary channel; this poll is the fallback for when the
  // socket is down or a change arrives from another tab. It pauses on hidden
  // tabs and backs off while the room is quiet — see lib/room-poll.js.
  const stopPoll = createRoomPoll({
    load: () => load(code),
    onState: deliver,
    baseInterval: pollInterval,
    maxInterval: maxPollInterval,
  });
  // Realtime attaches when the SDK finishes loading. The poll above is already
  // running, so a subscriber is never left with nothing while that happens, and
  // unsubscribing before it resolves is handled by the cancelled flag.
  let cancelled = false;
  let attached = null;

  void getConfiguredSupabaseClient().then((supabase) => {
    if (cancelled || !supabase) return;
    const subscription = supabase
      .channel(`${channelPrefix}:${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `code=eq.${code}` }, (payload) => {
        if (payload.new?.state) deliver(payload.new.state);
      })
      .subscribe();
    attached = { supabase, subscription };
  });

  return () => {
    cancelled = true;
    broadcastChannel?.close();
    stopPoll();
    if (attached) void attached.supabase.removeChannel(attached.subscription);
  };
}
