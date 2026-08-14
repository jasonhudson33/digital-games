import { createSupabaseRoomStore } from "./supabase-server-room-store.js";

const store = createSupabaseRoomStore({
  namespace: "secret-hitler",
  memoryKey: "__secretHitlerRooms",
  missingSupabaseMessage:
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before using Secret Hitler rooms.",
});

export const saveSecretHitlerRoom = (room) => store.save(room);
export const loadSecretHitlerRoom = (roomCode) => store.load(roomCode);
export const secretHitlerRoomExists = (roomCode) => store.exists(roomCode);
