import type { SupabaseClient } from '@supabase/supabase-js';

export function getConfiguredSupabaseClient(): SupabaseClient | null;

export function subscribeToRoomState<T extends { roomCode: string; updatedAt: number }>(options: {
  supabase: SupabaseClient | null;
  roomCode: string;
  table: string;
  channelPrefix: string;
  broadcastName: string;
  load: (roomCode: string) => Promise<T | null>;
  migrate: (state: T) => T;
  handler: (state: T) => void;
  pollInterval?: number;
}): () => void;
