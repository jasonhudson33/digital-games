import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { board } from './board';
import { GameState, PlayerPiece } from './types';

type Handler = (state: GameState) => void;

const channelName = 'monopoly-room-updates';
const validPieces: PlayerPiece[] = [
  'car',
  'ship',
  'hat',
  'boot',
  'dog',
  'cat',
  'train',
  'plane',
  'gem',
  'house',
  'rocket',
  'castle',
  'basketball',
  'soccer',
  'volleyball',
  'tennis',
  'baseball',
  'baseballBat'
];

const getSupabase = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_VITE_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
};

const supabase = getSupabase();

export const isOnlineSyncEnabled = Boolean(supabase);

export const RoomService = {
  async save(state: GameState) {
    localStorage.setItem(`monopoly:${state.roomCode}`, JSON.stringify(state));
    broadcast(state);

    if (!supabase) {
      await saveLocalRoom(state);
      return;
    }

    const { error } = await supabase.from('monopoly_rooms').upsert({
      code: state.roomCode,
      state,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  async load(roomCode: string): Promise<GameState | null> {
    const code = roomCode.trim().toUpperCase();
    if (supabase) {
      const { data, error } = await supabase.from('monopoly_rooms').select('state').eq('code', code).maybeSingle();
      if (error) throw error;
      if (data?.state) return normalizeState(data.state as GameState);
    }

    const localRoom = await loadLocalRoom(code);
    if (localRoom) return localRoom;

    const cached = localStorage.getItem(`monopoly:${code}`);
    return cached ? normalizeState(JSON.parse(cached) as GameState) : null;
  },

  subscribe(roomCode: string, handler: Handler) {
    const code = roomCode.trim().toUpperCase();
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel(channelName) : null;

    bc?.addEventListener('message', (event: MessageEvent<GameState>) => {
      if (event.data.roomCode === code) handler(event.data);
    });

    let pollId: number | null = null;
    let lastSeen = 0;

    if (!supabase) {
      pollId = window.setInterval(() => {
        void loadLocalRoom(code).then((remote) => {
          if (!remote || remote.updatedAt <= lastSeen) return;
          lastSeen = remote.updatedAt;
          handler(normalizeState(remote));
        });
      }, 1000);
    }

    const subscription = supabase
      ?.channel(`monopoly:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monopoly_rooms', filter: `code=eq.${code}` },
        (payload) => {
          const next = payload.new as { state?: GameState };
          if (next?.state) handler(normalizeState(next.state));
        }
      )
      .subscribe();

    return () => {
      bc?.close();
      if (pollId) {
        window.clearInterval(pollId);
      }
      if (subscription && supabase) {
        void supabase.removeChannel(subscription);
      }
    };
  }
};

const saveLocalRoom = async (state: GameState) => {
  try {
    await fetch(`/api/monopoly/rooms/${state.roomCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    });
  } catch {
    // Static previews will not have the Vite dev-only room API.
  }
};

const loadLocalRoom = async (roomCode: string): Promise<GameState | null> => {
  try {
    const response = await fetch(`/api/monopoly/rooms/${roomCode}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: GameState | null };
    return data.state ? normalizeState(data.state) : null;
  } catch {
    return null;
  }
};

const normalizeState = (state: GameState): GameState => ({
  ...state,
  doubleRollCount: state.doubleRollCount ?? 0,
  jailRollMode: state.jailRollMode ?? null,
  pendingCard: state.pendingCard ?? null,
  pendingPurchase: state.pendingPurchase ?? null,
  pendingTax: state.pendingTax ?? null,
  pendingRent: state.pendingRent ?? null,
  pendingUtilityRent: normalizeUtilityRent(state),
  pendingDebt: state.pendingDebt ?? null,
  pendingAuction: state.pendingAuction ?? null,
  pendingJailExit: state.pendingJailExit ?? null,
  pendingTrade: state.pendingTrade
    ? {
        ...state.pendingTrade,
        offeredMoney: state.pendingTrade.offeredMoney ?? 0,
        requestedMoney: state.pendingTrade.requestedMoney ?? 0,
        offeredJailCards: state.pendingTrade.offeredJailCards ?? 0,
        requestedJailCards: state.pendingTrade.requestedJailCards ?? 0
      }
    : null,
  improvements: state.improvements ?? {},
  players: state.players.map((player) => ({
    ...player,
    mortgagedProperties: player.mortgagedProperties ?? [],
    getOutOfJailFreeCards: player.getOutOfJailFreeCards ?? 0,
    jailTurnCount: player.jailTurnCount ?? 0,
    piece: validPieces.includes(player.piece) ? player.piece : 'car'
  }))
});

const normalizeUtilityRent = (state: GameState) => {
  const pending = state.pendingUtilityRent;
  if (!pending) return null;
  if (pending.multiplier === 10) return pending;

  const owner = state.players.find((player) => player.id === pending.ownerId);
  const ownedUtilities = owner?.properties.filter((spaceId) => board[spaceId]?.kind === 'utility').length ?? 0;
  return {
    ...pending,
    multiplier: ownedUtilities >= 2 ? 10 : 4
  };
};

const broadcast = (state: GameState) => {
  if (!('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(state);
  channel.close();
};
