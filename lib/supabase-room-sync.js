import { createClient } from "@supabase/supabase-js";

const clients = globalThis.__digitalGamesSupabaseClients || new Map();
globalThis.__digitalGamesSupabaseClients = clients;

export function getConfiguredSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const key = `${url}:${anonKey}`;
  if (!clients.has(key)) clients.set(key, createClient(url, anonKey));
  return clients.get(key);
}

export function subscribeToRoomState({
  supabase,
  roomCode,
  table,
  channelPrefix,
  broadcastName,
  load,
  migrate,
  handler,
  pollInterval = 1500,
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
  const pollId = window.setInterval(() => {
    void load(code).then((remote) => remote && deliver(remote)).catch(() => undefined);
  }, pollInterval);
  const subscription = supabase
    ?.channel(`${channelPrefix}:${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table, filter: `code=eq.${code}` }, (payload) => {
      if (payload.new?.state) deliver(payload.new.state);
    })
    .subscribe();

  return () => {
    broadcastChannel?.close();
    window.clearInterval(pollId);
    if (subscription && supabase) void supabase.removeChannel(subscription);
  };
}
