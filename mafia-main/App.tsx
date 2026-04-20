import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GamePhase, GameState, Player, Role, RoleMap, RoomMeta, DayIntent, NightIntent } from './types';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import Setup from './components/Setup';
import RoleReveal from './components/RoleReveal';
import NightPhase from './components/NightPhase';
import DayPhase from './components/DayPhase';
import GameOver from './components/GameOver';
import { RoomService } from './services/RoomService';
import { narrator } from './services/SpeechService';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from '@firebase/auth';

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

const App: React.FC = () => {
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => getStoredValue('mafia_player_id'));
  const [cachedPlayerName, setCachedPlayerName] = useState<string>(() => getStoredValue('mafia_player_name') || '');
  const [gameState, setGameState] = useState<GameState>(makeInitialState());
  const [meta, setMeta] = useState<RoomMeta | null>(null);

  const [rolesMap, setRolesMap] = useState<RoleMap>({});
  const rolesMapRef = useRef<RoleMap>({});
  useEffect(() => { rolesMapRef.current = rolesMap; }, [rolesMap]);

  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // ---------- Auth bootstrap ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) signInAnonymously(auth).catch(console.error);
      if (user && !myPlayerId) {
        // default to uid for identity
        setMyPlayerId(user.uid);
        localStorage.setItem('mafia_player_id', user.uid);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myRole: Role = useMemo(() => {
    if (!myPlayerId) return Role.CITIZEN;
    return rolesMap[myPlayerId] || Role.CITIZEN;
  }, [rolesMap, myPlayerId]);

  // Acting host: alive host if present, else first alive player
  const actingHostId = useMemo(() => {
    const alive = gameState.players.filter(p => p.isAlive);
    const hostAlive = alive.find(p => p.isHost);
    return hostAlive?.id || alive[0]?.id || null;
  }, [gameState.players]);

  const isActingHost = !!myPlayerId && actingHostId === myPlayerId;

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

  // Host gets full roles for aggregation + win checks
  useEffect(() => {
    if (!gameState.roomCode) return;
    if (!isActingHost) return;

    return RoomService.subscribeToRoles(gameState.roomCode, (rm) => setRolesMap(rm));
  }, [gameState.roomCode, isActingHost]);

  // Non-host loads only their role
  useEffect(() => {
    const code = gameState.roomCode;
    if (!code || !myPlayerId) return;
    if (isActingHost) return;

    RoomService.getMyRole(code, myPlayerId).then((role) => {
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

      const remaining = state.players.filter(p => !leaving.has(p.id));
      if (remaining.length === state.players.length) return;

      // Promote if host left
      let updated = remaining.map(p => ({ ...p }));
      const hasHost = updated.some(p => p.isHost);
      if (!hasHost && updated.length) {
        updated[0].isHost = true;
      }

      const next = sanitizeState({ ...state, players: updated, lastUpdated: Date.now() });
      await RoomService.saveState(code, next);

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
        if (state.phase === GamePhase.NIGHT_KILLER) await hostUpdateState({ phase: GamePhase.NIGHT_DETECTIVE, nightActions: {} });
        else if (state.phase === GamePhase.NIGHT_DETECTIVE) await hostUpdateState({ phase: GamePhase.NIGHT_ANGEL, nightActions: {} });
        else await hostUpdateState({ phase: GamePhase.DAY_RESULTS, nightActions: {} });
        return;
      }

      // Host writes aggregated actor->target map for UI progress
      const aggregated: Record<string, string> = {};
      for (const uid of actors) {
        const t = intents[uid]?.targetId;
        if (t) aggregated[uid] = t;
      }
      if (JSON.stringify(aggregated) !== JSON.stringify(state.nightActions || {})) {
        await RoomService.saveState(code, sanitizeState({ ...state, nightActions: aggregated, lastUpdated: Date.now() }));
      }

      // Check consensus
      const targets = actors.map(a => intents[a]?.targetId).filter(Boolean) as string[];
      const hasAll = targets.length === actors.length;
      const allSame = hasAll && targets.every(t => t === targets[0]);
      if (!allSame) return;

      const targetId = targets[0];

      if (state.phase === GamePhase.NIGHT_KILLER) {
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

      const nominations: Record<string, string> = {};
      const seconds: Record<string, string[]> = {};
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
  }, [gameState.roomCode, isActingHost, gameState.round]);

  // ---------- Phase narration helpers ----------
  useEffect(() => {
    const state = gameState;
    if (!state.roomCode) return;

    const run = async () => {
      if (state.phase === GamePhase.NIGHT_TRANSITION) {
        await narrator.speak('Night falls. Close your eyes.');
        if (isActingHost) await hostUpdateState({ phase: GamePhase.NIGHT_KILLER });
      }
      if (state.phase === GamePhase.DAY_RESULTS) {
        await narrator.speak('Day breaks.');
      }
    };
    run().catch(console.error);
  }, [gameState.phase, gameState.roomCode, hostUpdateState, isActingHost]);

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
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('Auth not ready yet. Try again.');
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

    await RoomService.setMeta(code, { hostUid: uid, createdAt: Date.now(), version: 1 });
    await RoomService.saveState(code, state);

    setGameState(state);
  }, []);

  const handleJoinRoom = useCallback(async (name: string, code: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('Auth not ready yet. Try again.');
      return;
    }

    const remote = await RoomService.getState(code);
    if (!remote) {
      alert('Room not found!');
      return;
    }

    localStorage.setItem('mafia_player_id', uid);
    localStorage.setItem('mafia_player_name', name);
    setCachedPlayerName(name);
    setMyPlayerId(uid);

    setGameState(sanitizeState(remote));
    await RoomService.submitJoinRequest(code, uid, name);
  }, []);

  const restartGame = useCallback(() => {
    setGameState(makeInitialState());
    setRolesMap({});
    setMeta(null);
  }, []);

  const handleLeaveRoom = useCallback(async () => {
    const code = gameStateRef.current.roomCode;
    if (code && myPlayerId) {
      await RoomService.submitLeaveRequest(code, myPlayerId);
    }
    restartGame();
  }, [myPlayerId, restartGame]);

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

  // ---------- Render ----------
  if (gameState.phase === GamePhase.LANDING) {
    return <Landing initialName={cachedPlayerName} onCreate={handleCreateRoom} onJoin={handleJoinRoom} />;
  }

  if (!myPlayerId || !myPlayer) {
    // If we've joined but host hasn't admitted us yet, show lobby-like waiting.
    if (gameState.phase !== GamePhase.LANDING) {
      return (
        <div className="min-h-screen flex items-center justify-center text-slate-200">
          <div className="text-center">
            <p className="text-xl mb-2">Joining room…</p>
            <p className="text-slate-500">Waiting for host approval.</p>
            <Button className="mt-6" onClick={restartGame}>Back</Button>
          </div>
        </div>
      );
    }
  }

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <Lobby
        roomCode={gameState.roomCode}
        players={gameState.players}
        isHost={isActingHost}
        onStart={handleLobbyStart}
      />
    );
  }

  if (gameState.phase === GamePhase.SETUP) {
    return <Setup players={gameState.players} onStart={handleStartGame} />;
  }

  if (gameState.phase === GamePhase.ROLE_REVEAL && myPlayer) {
    return (
      <RoleReveal
        player={myPlayer}
        myRole={myRole}
        players={gameState.players}
        roomCode={gameState.roomCode}
        round={gameState.round}
        isHost={isActingHost}
        onComplete={handleBeginNight}
      />
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
            <Button className="mt-8" onClick={handleLeaveRoom}>Leave Room</Button>
          </div>
        </div>
      );
    }

    return (
      <NightPhase
        state={gameState}
        myPlayerId={myPlayerId}
        myRole={myRole}
        roomCode={gameState.roomCode}
        rolesMap={isActingHost ? rolesMap : { [myPlayerId]: myRole }}
      />
    );
  }

  if ([GamePhase.DAY_RESULTS, GamePhase.DAY_DELIBERATION, GamePhase.DAY_VOTING].includes(gameState.phase)) {
    return (
      <DayPhase
        state={gameState}
        myPlayerId={myPlayerId}
        isHost={isActingHost}
        roomCode={gameState.roomCode}
        onHostAction={hostUpdateState}
      />
    );
  }

  if (gameState.phase === GamePhase.GAME_OVER) {
    return (
      <GameOver
        winner={gameState.winner}
        players={gameState.players}
        revealedRoles={gameState.revealedRoles}
        onRestart={restartGame}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-200">
      <p>Unknown state.</p>
      <Button className="mt-6" onClick={restartGame}>Back</Button>
    </div>
  );
};

export default App;
