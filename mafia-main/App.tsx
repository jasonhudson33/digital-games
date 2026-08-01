import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GamePhase, GameState, Player, Role, RoleMap, RoomMeta, DayIntent, NightIntent, PresenceMap } from './types';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import Setup from './components/Setup';
import RoleReveal from './components/RoleReveal';
import NightPhase from './components/NightPhase';
import DayPhase from './components/DayPhase';
import GameOver from './components/GameOver';
import Button from './components/Button';
import { RoomService } from './services/RoomService';
import { MAFIA_NARRATION, narrator } from './services/SpeechService';
import { getMafiaIdentity, getSupabaseSetupError } from './supabase';

const makeInitialState = (): GameState => ({
  roomCode: '',
  players: [],
  phase: GamePhase.LANDING,
  round: 1,
  trialLimit: 2,
  killerTargetId: null,
  detectiveCheckId: null,
  angelSaveId: null,
  lastAngelSavedId: null,
  nightResults: [],
  nightActions: {},
  nominations: {},
  seconds: {},
  dayVotes: {},
  winner: null,
  lastUpdated: 0,
});

const sanitizeState = (state: GameState): GameState => ({
  ...state,
  nightResults: state.nightResults || [],
  nightActions: state.nightActions || {},
  nominations: state.nominations || {},
  seconds: state.seconds || {},
  dayVotes: state.dayVotes || {},
});

const getStoredValue = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
};

const LAST_ROOM_KEY = 'mafia_last_room';
const PRESENCE_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15 * 1000;

const rememberRoom = (roomCode: string) => {
  if (typeof window === 'undefined') return;
  const code = roomCode.trim().toUpperCase();
  window.localStorage.setItem(LAST_ROOM_KEY, code);
  window.history.replaceState(null, '', `${window.location.pathname}?room=${code}`);
};

const forgetRoom = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LAST_ROOM_KEY);
  window.history.replaceState(null, '', window.location.pathname);
};

const deterministicPlayer = (players: Player[], seed: string): Player | null => {
  if (!players.length) return null;
  const hash = Array.from(seed).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
  return players[hash % players.length];
};

const RoomLeaveButton: React.FC<{
  gameStarted: boolean;
  isLeaving: boolean;
  onLeave: () => void;
}> = ({ gameStarted, isLeaving, onLeave }) => (
  <Button
    variant="danger"
    className="fixed bottom-4 right-4 z-50 shadow-2xl"
    disabled={isLeaving}
    onClick={onLeave}
  >
    {isLeaving ? 'Leaving...' : gameStarted ? 'Leave Game' : 'Leave Room'}
  </Button>
);

const App: React.FC = () => {
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [cachedPlayerName, setCachedPlayerName] = useState<string>(() => getStoredValue('mafia_player_name') || '');
  const [gameState, setGameState] = useState<GameState>(makeInitialState());
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [presence, setPresence] = useState<PresenceMap>({});
  const [presenceReady, setPresenceReady] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(getSupabaseSetupError());

  const [rolesMap, setRolesMap] = useState<RoleMap>({});
  const rolesMapRef = useRef<RoleMap>({});
  useEffect(() => { rolesMapRef.current = rolesMap; }, [rolesMap]);

  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // ---------- Device identity bootstrap ----------
  useEffect(() => {
    if (connectionError) return;
    const current = getMafiaIdentity();
    if (!current) {
      setConnectionError('This browser could not create a Mafia player identity.');
      return;
    }
    setMyPlayerId(current.playerId);
    setIdentityReady(true);
  }, []);

  useEffect(() => {
    if (!identityReady || !myPlayerId || gameStateRef.current.phase !== GamePhase.LANDING) return;
    const queryRoom = new URLSearchParams(window.location.search).get('room');
    const storedRoom = getStoredValue(LAST_ROOM_KEY);
    const roomCode = (queryRoom || storedRoom || '').trim().toUpperCase();
    if (!roomCode) return;
    let active = true;

    const reconnect = async () => {
      const remote = await RoomService.getState(roomCode);
      const returningPlayer = remote?.players.find((player) => player.id === myPlayerId);
      if (!active || !remote || !returningPlayer || returningPlayer.hasLeft) {
        if (active && storedRoom === roomCode) forgetRoom();
        return;
      }
      await RoomService.heartbeat(roomCode);
      if (!active) return;
      localStorage.setItem('mafia_player_name', returningPlayer.name);
      setCachedPlayerName(returningPlayer.name);
      setGameState(sanitizeState(remote));
      rememberRoom(roomCode);
    };

    void reconnect().catch((error) => {
      console.error('Could not reconnect to Mafia room', error);
    });
    return () => { active = false; };
  }, [identityReady, myPlayerId]);

  const myRole: Role = useMemo(() => {
    if (!myPlayerId) return Role.CITIZEN;
    return rolesMap[myPlayerId] || Role.CITIZEN;
  }, [rolesMap, myPlayerId]);

  // Acting host: alive host if present, else first alive player
  const actingHostId = useMemo(() => {
    const alive = gameState.players.filter(p => p.isAlive && !p.hasLeft);
    if (presenceReady) {
      const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
      const online = alive.filter((player) => (presence[player.id] || 0) > cutoff);
      const onlineHost = online.find((player) => player.isHost);
      return onlineHost?.id || online[0]?.id || null;
    }
    const hostAlive = alive.find((player) => player.isHost);
    return hostAlive?.id || alive[0]?.id || null;
  }, [gameState.players, presence, presenceReady]);

  const isActingHost = !!myPlayerId && actingHostId === myPlayerId;
  const computerPlayerKey = useMemo(
    () => gameState.players.map((player) => `${player.id}:${Boolean(player.isComputer)}`).join('|'),
    [gameState.players]
  );

  useEffect(() => {
    if (!isActingHost) return;
    let unlocked = false;
    const unlockHostAudio = () => {
      if (unlocked) return;
      unlocked = true;
      void narrator.unlock().then(() => narrator.preloadAll());
    };
    window.addEventListener('pointerdown', unlockHostAudio, { once: true });
    window.addEventListener('keydown', unlockHostAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockHostAudio);
      window.removeEventListener('keydown', unlockHostAudio);
    };
  }, [isActingHost]);

  const shouldUpdateState = useCallback((remote: GameState, local: GameState) => {
    // Prefer newer updates, but allow equal if phase changed
    if (remote.lastUpdated > local.lastUpdated) return true;
    if (remote.lastUpdated === local.lastUpdated && remote.phase !== local.phase) return true;
    return false;
  }, []);

  // ---------- Subscriptions ----------
  useEffect(() => {
    if (!gameState.roomCode) return;

    const unsubState = RoomService.subscribeToState(gameState.roomCode, (remote) => {
      const sanitized = sanitizeState(remote);
      if (shouldUpdateState(sanitized, gameStateRef.current)) {
        setGameState(sanitized);
      }
    });

    const unsubMeta = RoomService.subscribeToMeta(gameState.roomCode, setMeta);

    return () => {
      unsubState();
      unsubMeta();
    };
  }, [gameState.roomCode, shouldUpdateState]);

  useEffect(() => {
    const roomCode = gameState.roomCode;
    if (!roomCode || !myPlayerId) return;
    setPresenceReady(false);
    const unsubscribe = RoomService.subscribeToPresence(roomCode, (nextPresence) => {
      setPresence(nextPresence);
      setPresenceReady(true);
    });
    return unsubscribe;
  }, [gameState.roomCode, myPlayerId]);

  useEffect(() => {
    const roomCode = gameState.roomCode;
    if (!roomCode || !myPlayerId || !gameState.players.some((player) => player.id === myPlayerId)) return;
    const heartbeat = () => void RoomService.heartbeat(roomCode).catch((error) => {
      console.error('Could not update Mafia presence', error);
    });
    heartbeat();
    const intervalId = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') heartbeat();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', heartbeat);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', heartbeat);
    };
  }, [gameState.roomCode, gameState.players, myPlayerId]);

  // Host gets full roles for aggregation + win checks
  useEffect(() => {
    if (!gameState.roomCode) return;
    if (!isActingHost) return;

    return RoomService.subscribeToRoles(gameState.roomCode, (rm) => setRolesMap(rm));
  }, [gameState.roomCode, isActingHost]);

  // Non-host continuously watches only their private role. The role row is created
  // after the lobby loads, so a one-time read would leave them as a Citizen.
  useEffect(() => {
    const code = gameState.roomCode;
    if (!code || !myPlayerId) return;
    if (isActingHost) return;

    return RoomService.subscribeToMyRole(code, myPlayerId, (role) => {
      if (!role) return;
      setRolesMap((prev) => ({ ...prev, [myPlayerId]: role }));
    });
  }, [gameState.roomCode, myPlayerId, isActingHost]);

  // ---------- Host-only canonical state updates ----------
  const hostUpdateState = useCallback(async (updates: Partial<GameState>) => {
    const current = gameStateRef.current;
    const next = sanitizeState({ ...current, ...updates, lastUpdated: Date.now() });

    setGameState(next);
    if (next.roomCode) {
      await RoomService.saveState(next.roomCode, next);
    }
  }, []);

  useEffect(() => {
    if (!isActingHost || !presenceReady || !gameState.roomCode) return;
    const now = Date.now();
    let changed = false;
    const players = gameState.players.map((player) => {
      if (player.hasLeft) return player;
      const lastSeen = presence[player.id] || 0;
      const shouldBeComputer = lastSeen > 0 && now - lastSeen >= PRESENCE_TIMEOUT_MS;
      if (Boolean(player.isComputer) === shouldBeComputer) return player;
      changed = true;
      return {
        ...player,
        isComputer: shouldBeComputer,
        computerSince: shouldBeComputer ? now : undefined,
      };
    });
    if (changed) void hostUpdateState({ players }).catch(console.error);
  }, [gameState.players, gameState.roomCode, hostUpdateState, isActingHost, presence, presenceReady]);

  const computeWinner = useCallback((state: GameState, rm: RoleMap): 'CITIZENS' | 'KILLERS' | null => {
    const alive = state.players.filter(p => p.isAlive);
    const killers = alive.filter(p => rm[p.id] === Role.KILLER).length;
    const town = alive.length - killers;
    if (alive.length === 0) return null;
    if (killers === 0) return 'CITIZENS';
    if (killers >= town && killers > 0) return 'KILLERS';
    return null;
  }, []);

  const maybeEndGame = useCallback(async () => {
    if (!isActingHost) return;
    const state = gameStateRef.current;
    const rm = rolesMapRef.current;
    const winner = computeWinner(state, rm);
    if (winner && state.phase !== GamePhase.GAME_OVER) {
      await hostUpdateState({ phase: GamePhase.GAME_OVER, winner, revealedRoles: rm });
    }
  }, [computeWinner, hostUpdateState, isActingHost]);

  // ---------- Host aggregation: join/leave/ready/intents ----------
  useEffect(() => {
    if (!gameState.roomCode || !isActingHost) return;
    const code = gameState.roomCode;

    const unsubJoin = RoomService.subscribeToJoinRequests(code, async (reqs) => {
      const state = gameStateRef.current;
      const existing = new Set(state.players.map(p => p.id));
      const additions: Player[] = [];

      for (const [uid, req] of Object.entries(reqs)) {
        if (!existing.has(uid)) {
          additions.push({
            id: uid,
            name: req.name,
            cardCode: '',
            isAlive: true,
            voteCount: 0,
            isHost: false,
            isReady: false,
          });
        }
      }

      if (additions.length) {
        const next = sanitizeState({ ...state, players: [...state.players, ...additions], lastUpdated: Date.now() });
        await RoomService.saveState(code, next);
        await Promise.all(additions.map(p => RoomService.clearJoinRequest(code, p.id)));
      }
    });

    const unsubLeave = RoomService.subscribeToLeaveRequests(code, async (reqs) => {
      const state = gameStateRef.current;
      const leaving = new Set(Object.keys(reqs));
      if (!leaving.size) return;

      const gameInProgress = ![GamePhase.LOBBY, GamePhase.SETUP, GamePhase.GAME_OVER].includes(state.phase);
      let changed = false;
      let updated = state.players.flatMap((player) => {
        if (!leaving.has(player.id)) return [{ ...player }];
        changed = true;
        if (gameInProgress && player.isAlive) {
          return [{
            ...player,
            isComputer: true,
            computerSince: Date.now(),
            hasLeft: true,
          }];
        }
        return [];
      });

      // Promote a remaining human only when the old host's seat was removed.
      const hasHost = updated.some(p => p.isHost);
      if (!hasHost && updated.length) {
        const nextHost = updated.find((player) => !player.hasLeft) || updated[0];
        nextHost.isHost = true;
      }

      if (changed) {
        const next = sanitizeState({ ...state, players: updated, lastUpdated: Date.now() });
        await RoomService.saveState(code, next);
      }
      await Promise.all(Object.keys(reqs).map((uid) => RoomService.clearLeaveRequest(code, uid)));

      // Keep meta.hostUid aligned with current host for rules
      const host = updated.find(p => p.isHost)?.id;
      if (host && meta?.hostUid !== host) {
        await RoomService.setMeta(code, { hostUid: host, createdAt: meta?.createdAt || Date.now(), version: (meta?.version || 1) + 1 });
      }
    });

    const unsubReady = RoomService.subscribeToReady(code, gameState.round, async (ready) => {
      const state = gameStateRef.current;
      if (state.phase !== GamePhase.ROLE_REVEAL) return;

      const readySet = new Set(Object.keys(ready));
      state.players.filter((player) => player.isComputer).forEach((player) => readySet.add(player.id));
      const updatedPlayers = state.players.map(p => ({ ...p, isReady: readySet.has(p.id) }));

      const next = sanitizeState({ ...state, players: updatedPlayers, lastUpdated: Date.now() });
      await RoomService.saveState(code, next);

      const allReady = updatedPlayers.length > 0 && updatedPlayers.every(p => p.isReady);
      if (allReady) {
        await hostUpdateState({ phase: GamePhase.NIGHT_TRANSITION });
      }
    });

    const unsubNight = RoomService.subscribeToNightIntents(code, gameState.round, async (intents) => {
      const state = gameStateRef.current;
      if (![GamePhase.NIGHT_KILLER, GamePhase.NIGHT_DETECTIVE, GamePhase.NIGHT_ANGEL].includes(state.phase)) return;

      const rm = rolesMapRef.current;

      const roleNeeded =
        state.phase === GamePhase.NIGHT_KILLER ? Role.KILLER :
        state.phase === GamePhase.NIGHT_DETECTIVE ? Role.DETECTIVE :
        Role.ANGEL;

      const actors = state.players.filter(p => p.isAlive && rm[p.id] === roleNeeded).map(p => p.id);

      if (!actors.length) {
        // Skip empty role phase
        if (state.phase === GamePhase.NIGHT_KILLER) {
          await narrator.speak(MAFIA_NARRATION.detectivesWake);
          await hostUpdateState({ phase: GamePhase.NIGHT_DETECTIVE, nightActions: {} });
        } else if (state.phase === GamePhase.NIGHT_DETECTIVE) {
          await narrator.speak(MAFIA_NARRATION.angelsWake);
          await hostUpdateState({ phase: GamePhase.NIGHT_ANGEL, nightActions: {} });
        } else {
          await narrator.speak(MAFIA_NARRATION.morning);
          await hostUpdateState({ phase: GamePhase.DAY_RESULTS, nightActions: {} });
        }
        return;
      }

      const actorPlayers = state.players.filter((player) => actors.includes(player.id));
      const humanTarget = actorPlayers
        .filter((player) => !player.isComputer)
        .map((player) => intents[player.id]?.targetId)
        .find(Boolean);
      const computerTarget = humanTarget || deterministicPlayer(
        state.players.filter((player) => player.isAlive && !actors.includes(player.id)),
        `${state.roomCode}:${state.round}:${state.phase}`
      )?.id;

      // Host writes aggregated human and computer actions for UI progress.
      const aggregated: Record<string, string> = {};
      for (const actor of actorPlayers) {
        const t = actor.isComputer ? computerTarget : intents[actor.id]?.targetId;
        if (t) aggregated[actor.id] = t;
      }
      if (JSON.stringify(aggregated) !== JSON.stringify(state.nightActions || {})) {
        await RoomService.saveState(code, sanitizeState({ ...state, nightActions: aggregated, lastUpdated: Date.now() }));
      }

      // Check consensus
      const targets = actors.map((actorId) => aggregated[actorId]).filter(Boolean) as string[];
      const hasAll = targets.length === actors.length;
      const allSame = hasAll && targets.every(t => t === targets[0]);
      if (!allSame) return;

      const targetId = targets[0];

      if (state.phase === GamePhase.NIGHT_KILLER) {
        await narrator.speak(MAFIA_NARRATION.detectivesWake);
        await hostUpdateState({ killerTargetId: targetId, nightActions: {}, phase: GamePhase.NIGHT_DETECTIVE });
      } else if (state.phase === GamePhase.NIGHT_DETECTIVE) {
        // Save private results for each detective
        for (const uid of actors) {
          await RoomService.setDetectiveResult(code, state.round, uid, {
            targetId,
            isKiller: rm[targetId] === Role.KILLER,
            ts: Date.now(),
          });
        }
        await narrator.speak(MAFIA_NARRATION.angelsWake);
        await hostUpdateState({ detectiveCheckId: targetId, nightActions: {}, phase: GamePhase.NIGHT_ANGEL });
      } else if (state.phase === GamePhase.NIGHT_ANGEL) {
        await hostUpdateState({ angelSaveId: targetId, nightActions: {} });
        // Resolve night
        const kill = state.killerTargetId;
        const save = targetId;
        const results: string[] = [];
        const updatedPlayers = state.players.map(p => ({ ...p }));

        if (kill && kill === save) {
          results.push('A life was spared in the night.');
        } else if (kill) {
          const victim = updatedPlayers.find(p => p.id === kill);
          if (victim) {
            victim.isAlive = false;
            results.push(`${victim.name} was eliminated in the night.`);
          }
        } else {
          results.push('The night passed without incident.');
        }

        await narrator.speak(MAFIA_NARRATION.morning);
        await hostUpdateState({
          nightResults: results,
          lastAngelSavedId: save,
          phase: GamePhase.DAY_RESULTS,
        });

        await maybeEndGame();
      }
    });

    const unsubDay = RoomService.subscribeToDayIntents(code, gameState.round, async (intents) => {
      const state = gameStateRef.current;
      if (![GamePhase.DAY_DELIBERATION, GamePhase.DAY_VOTING].includes(state.phase)) return;

      const entries = Object.entries(intents).sort((a, b) => a[1].ts - b[1].ts);

      const nominations: Record<string, string> = state.phase === GamePhase.DAY_VOTING ? { ...state.nominations } : {};
      const seconds: Record<string, string[]> = state.phase === GamePhase.DAY_VOTING
        ? Object.fromEntries(Object.entries(state.seconds).map(([targetId, voters]) => [targetId, [...voters]]))
        : {};
      const dayVotes: Record<string, string> = {};

      for (const [uid, intent] of entries) {
        if (intent.kind === 'NOMINATE') nominations[uid] = intent.targetId;
        if (intent.kind === 'RESCIND') delete nominations[uid];

        if (intent.kind === 'SECOND') {
          const t = intent.targetId;
          seconds[t] = seconds[t] || [];
          if (!seconds[t].includes(uid)) seconds[t].push(uid);
        }

        if (intent.kind === 'VOTE') dayVotes[uid] = intent.targetId;
      }

      const computerPlayers = state.players.filter((player) => player.isAlive && player.isComputer);
      if (state.phase === GamePhase.DAY_DELIBERATION) {
        for (const computer of computerPlayers) {
          if (!nominations[computer.id]) {
            const target = deterministicPlayer(
              state.players.filter((player) => player.isAlive && player.id !== computer.id),
              `${state.roomCode}:${state.round}:nominate:${computer.id}`
            );
            if (target) nominations[computer.id] = target.id;
          }
        }
        const nominatedTargets = Array.from(new Set(Object.values(nominations)));
        for (const computer of computerPlayers) {
          const targetId = nominatedTargets.find((target) => target !== computer.id && target !== nominations[computer.id]);
          if (!targetId) continue;
          seconds[targetId] = seconds[targetId] || [];
          if (!seconds[targetId].includes(computer.id)) seconds[targetId].push(computer.id);
        }
      }

      if (state.phase === GamePhase.DAY_VOTING) {
        const candidates = Array.from(new Set(Object.values(nominations))).filter(
          (targetId) => (seconds[targetId] || []).length > 0
        );
        for (const computer of computerPlayers) {
          const target = deterministicPlayer(
            candidates.filter((targetId) => targetId !== computer.id).map((targetId) =>
              state.players.find((player) => player.id === targetId)
            ).filter(Boolean) as Player[],
            `${state.roomCode}:${state.round}:vote:${computer.id}`
          );
          if (target) dayVotes[computer.id] = target.id;
        }
      }

      const next = sanitizeState({ ...state, nominations, seconds, dayVotes, lastUpdated: Date.now() });
      await RoomService.saveState(code, next);
    });

    return () => {
      unsubJoin();
      unsubLeave();
      unsubReady();
      unsubNight();
      unsubDay();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.roomCode, isActingHost, gameState.round, gameState.phase, computerPlayerKey]);

  // ---------- Host-owned phase narration ----------
  const narratedNightRef = useRef('');
  useEffect(() => {
    const state = gameState;
    if (!state.roomCode || !isActingHost || state.phase !== GamePhase.NIGHT_TRANSITION) return;
    const narrationKey = `${state.roomCode}:${state.round}`;
    if (narratedNightRef.current === narrationKey) return;
    narratedNightRef.current = narrationKey;
    let active = true;

    const run = async () => {
      await narrator.speak(MAFIA_NARRATION.sleep);
      await narrator.speak(MAFIA_NARRATION.killersWake);
      if (active && gameStateRef.current.phase === GamePhase.NIGHT_TRANSITION) {
        await hostUpdateState({ phase: GamePhase.NIGHT_KILLER });
      }
    };
    run().catch((error) => {
      narratedNightRef.current = '';
      console.error(error);
    });
    return () => {
      active = false;
      if (gameStateRef.current.phase === GamePhase.NIGHT_TRANSITION) {
        narratedNightRef.current = '';
      }
    };
  }, [gameState.phase, gameState.roomCode, gameState.round, hostUpdateState, isActingHost]);

  const narratedWinnerRef = useRef('');
  useEffect(() => {
    if (!isActingHost || gameState.phase !== GamePhase.GAME_OVER || !gameState.winner) return;
    const narrationKey = `${gameState.roomCode}:${gameState.round}:${gameState.winner}`;
    if (narratedWinnerRef.current === narrationKey) return;
    narratedWinnerRef.current = narrationKey;
    const script = gameState.winner === 'KILLERS' ? MAFIA_NARRATION.killersWin : MAFIA_NARRATION.citizensWin;
    void narrator.speak(script).catch(console.error);
  }, [gameState.phase, gameState.roomCode, gameState.round, gameState.winner, isActingHost]);

  // Host: auto-resolve day votes when all alive have voted
  useEffect(() => {
    if (!isActingHost) return;
    const state = gameState;
    if (state.phase !== GamePhase.DAY_VOTING) return;

    const alive = state.players.filter(p => p.isAlive);
    const votedCount = Object.keys(state.dayVotes || {}).length;

    if (alive.length > 0 && votedCount === alive.length) {
      const timer = setTimeout(async () => {
        // tally
        const tally: Record<string, number> = {};
        for (const t of Object.values(state.dayVotes)) tally[t] = (tally[t] || 0) + 1;

        const maxVotes = Math.max(...Object.values(tally));
        const top = Object.entries(tally).filter(([, v]) => v === maxVotes).map(([k]) => k);

        if (top.length !== 1) {
          await hostUpdateState({
            phase: GamePhase.NIGHT_TRANSITION,
            round: state.round + 1,
            nominations: {},
            seconds: {},
            dayVotes: {},
          });
          await RoomService.clearRoundIntents(state.roomCode, state.round);
          return;
        }

        const executedId = top[0];
        const updatedPlayers = state.players.map(p => p.id === executedId ? { ...p, isAlive: false } : p);

        const executedName = state.players.find(p => p.id === executedId)?.name || 'Someone';
        const results = [`${executedName} was eliminated by vote.`];

        await hostUpdateState({
          players: updatedPlayers,
          nightResults: results,
          phase: GamePhase.NIGHT_TRANSITION,
          round: state.round + 1,
          nominations: {},
          seconds: {},
          dayVotes: {},
        });

        await RoomService.clearRoundIntents(state.roomCode, state.round);
        await maybeEndGame();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [gameState, isActingHost, hostUpdateState, maybeEndGame]);

  // ---------- UI Handlers ----------
  const handleCreateRoom = useCallback(async (name: string) => {
    void narrator.unlock().then(() => narrator.preloadAll());
    const uid = myPlayerId;
    if (!uid) {
      alert(connectionError || 'Your player identity is not ready yet. Try again.');
      return;
    }

    const code = RoomService.generateRoomCode();

    localStorage.setItem('mafia_player_id', uid);
    localStorage.setItem('mafia_player_name', name);
    setCachedPlayerName(name);
    setMyPlayerId(uid);

    const hostPlayer: Player = {
      id: uid,
      name,
      cardCode: '',
      isAlive: true,
      voteCount: 0,
      isHost: true,
      isReady: false,
    };

    const state: GameState = sanitizeState({
      ...makeInitialState(),
      roomCode: code,
      players: [hostPlayer],
      phase: GamePhase.LOBBY,
      round: 1,
      lastUpdated: Date.now(),
    });

    await RoomService.createRoom(code, state, { hostUid: uid, createdAt: Date.now(), version: 1 });

    setGameState(state);
    rememberRoom(code);
  }, [connectionError, myPlayerId]);

  const handleJoinRoom = useCallback(async (name: string, code: string) => {
    const uid = myPlayerId;
    if (!uid) {
      alert(connectionError || 'Your player identity is not ready yet. Try again.');
      return;
    }

    try {
      const remote = await RoomService.getState(code);
      if (!remote) {
        alert('Room not found!');
        return;
      }

      const returningPlayer = remote.players.find((player) => player.id === uid && !player.hasLeft);
      if (returningPlayer) await RoomService.heartbeat(code);
      else await RoomService.submitJoinRequest(code, uid, name);
      localStorage.setItem('mafia_player_name', name);
      setCachedPlayerName(name);
      setGameState(sanitizeState(remote));
      rememberRoom(code);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown room error';
      alert(`Could not join room: ${message}`);
    }
  }, [connectionError, myPlayerId]);

  const restartGame = useCallback(() => {
    forgetRoom();
    setGameState(makeInitialState());
    setRolesMap({});
    setMeta(null);
    setPresence({});
    setPresenceReady(false);
  }, []);

  const handleLeaveRoom = useCallback(async () => {
    const code = gameStateRef.current.roomCode;
    if (!code || !myPlayerId || isLeaving) return;
    const confirmed = window.confirm(
      'Leave permanently? You will not be able to rejoin this room. If the game is active, a computer will take over for you.'
    );
    if (!confirmed) return;

    setIsLeaving(true);
    try {
      await RoomService.submitLeaveRequest(code, myPlayerId);
      restartGame();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown room error';
      alert(`Could not leave room: ${message}`);
      setIsLeaving(false);
    }
  }, [isLeaving, myPlayerId, restartGame]);

  const handleLobbyStart = useCallback(async () => {
    if (!isActingHost) return;
    await hostUpdateState({ phase: GamePhase.SETUP });
  }, [isActingHost, hostUpdateState]);

  const handleStartGame = useCallback(async (players: Player[], roles: RoleMap, trialLimit: number) => {
    if (!isActingHost) return;
    const code = gameStateRef.current.roomCode;
    if (!code) return;

    // Reset readiness
    const resetPlayers = players.map(p => ({ ...p, isReady: false }));

    await RoomService.setRoles(code, roles);
    setRolesMap(roles);

    await hostUpdateState({
      players: resetPlayers,
      trialLimit,
      phase: GamePhase.ROLE_REVEAL,
      round: 1,
      killerTargetId: null,
      detectiveCheckId: null,
      angelSaveId: null,
      nightResults: [],
      nightActions: {},
      nominations: {},
      seconds: {},
      dayVotes: {},
      winner: null,
      revealedRoles: undefined,
    });
  }, [hostUpdateState, isActingHost]);

  const handleBeginNight = useCallback(async () => {
    if (!isActingHost) return;
    await hostUpdateState({ phase: GamePhase.NIGHT_TRANSITION });
  }, [hostUpdateState, isActingHost]);

  const myPlayer = useMemo(() => {
    if (!myPlayerId) return null;
    return gameState.players.find(p => p.id === myPlayerId) || null;
  }, [gameState.players, myPlayerId]);

  const gameStarted = ![GamePhase.LOBBY, GamePhase.SETUP].includes(gameState.phase);
  const leaveButton = (
    <RoomLeaveButton gameStarted={gameStarted} isLeaving={isLeaving} onLeave={handleLeaveRoom} />
  );

  // ---------- Render ----------
  if (gameState.phase === GamePhase.LANDING) {
    return (
      <Landing
        initialName={cachedPlayerName}
        onCreate={handleCreateRoom}
        onJoin={handleJoinRoom}
        connectionError={connectionError}
        connectionReady={identityReady}
      />
    );
  }

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <>
        <Lobby
          roomCode={gameState.roomCode}
          players={gameState.players}
          isHost={isActingHost}
          onStart={handleLobbyStart}
        />
        {leaveButton}
      </>
    );
  }

  if (!myPlayerId || !myPlayer) {
    // The host may still be processing this player when the phase changes.
    if (gameState.phase !== GamePhase.LANDING) {
      return (
        <div className="min-h-screen flex items-center justify-center text-slate-200">
          <div className="text-center">
            <p className="text-xl mb-2">Joining room…</p>
            <p className="text-slate-500">Waiting for host approval.</p>
            {leaveButton}
          </div>
        </div>
      );
    }
  }

  if (gameState.phase === GamePhase.SETUP) {
    return <><Setup players={gameState.players} onStart={handleStartGame} />{leaveButton}</>;
  }

  if (gameState.phase === GamePhase.ROLE_REVEAL && myPlayer) {
    return (
      <>
        <RoleReveal
          player={myPlayer}
          myRole={myRole}
          players={gameState.players}
          roomCode={gameState.roomCode}
          round={gameState.round}
          isHost={isActingHost}
          onComplete={handleBeginNight}
        />
        {leaveButton}
      </>
    );
  }

  if (
    [GamePhase.NIGHT_TRANSITION, GamePhase.NIGHT_KILLER, GamePhase.NIGHT_DETECTIVE, GamePhase.NIGHT_ANGEL].includes(gameState.phase)
  ) {
    if (gameState.phase === GamePhase.NIGHT_TRANSITION) {
      return (
        <div className="min-h-screen flex items-center justify-center text-slate-200">
          <div className="text-center">
            <h2 className="text-4xl font-serif mb-4">Night Falls</h2>
            <p className="text-slate-500">Preparing the next phase…</p>
          </div>
          {leaveButton}
        </div>
      );
    }

    return (
      <>
        <NightPhase
          state={gameState}
          myPlayerId={myPlayerId}
          myRole={myRole}
          roomCode={gameState.roomCode}
          rolesMap={isActingHost ? rolesMap : { [myPlayerId]: myRole }}
        />
        {leaveButton}
      </>
    );
  }

  if ([GamePhase.DAY_RESULTS, GamePhase.DAY_DELIBERATION, GamePhase.DAY_VOTING].includes(gameState.phase)) {
    return (
      <>
        <DayPhase
          state={gameState}
          myPlayerId={myPlayerId}
          isHost={isActingHost}
          roomCode={gameState.roomCode}
          onHostAction={hostUpdateState}
        />
        {leaveButton}
      </>
    );
  }

  if (gameState.phase === GamePhase.GAME_OVER) {
    return (
      <>
        <GameOver
          winner={gameState.winner}
          players={gameState.players}
          revealedRoles={gameState.revealedRoles}
          onRestart={restartGame}
        />
        {leaveButton}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-200">
      <p>Unknown state.</p>
      {leaveButton}
    </div>
  );
};

export default App;
