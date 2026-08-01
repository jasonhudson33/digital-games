import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_VITE_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  : null;

export const getSupabaseSetupError = () =>
  supabase ? null : 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';

export type MafiaIdentity = { playerId: string; token: string };

const playerIdKey = 'mafia_player_id';
const tokenKey = 'mafia_player_token';

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

export const getMafiaIdentity = (): MafiaIdentity | null => {
  if (typeof window === 'undefined') return null;
  let playerId = localStorage.getItem(playerIdKey);
  let token = localStorage.getItem(tokenKey);
  if (!playerId || !token) {
    playerId = randomId();
    token = `${randomId()}-${randomId()}`;
    localStorage.setItem(playerIdKey, playerId);
    localStorage.setItem(tokenKey, token);
  }
  return { playerId, token };
};
