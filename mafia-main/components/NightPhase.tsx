import React, { useEffect, useMemo, useState } from 'react';
import { GamePhase, GameState, Role, Player, DetectiveResult, RoleMap } from '../types';
import { ROLE_DETAILS } from '../constants';
import Button from './Button';
import { RoomService } from '../services/RoomService';
import { canSelectNightTarget, nightActorsForRole, nightSelectionsByTarget } from '../services/NightRules';

interface NightPhaseProps {
  state: GameState;
  myPlayerId: string;
  myRole: Role;
  roomCode: string;
  rolesMap?: RoleMap; // host will have full map; others may have only their own role
}

const NightPhase: React.FC<NightPhaseProps> = ({ state, myPlayerId, myRole, roomCode, rolesMap }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detectiveResult, setDetectiveResult] = useState<DetectiveResult | null>(null);

  const me = state.players.find(p => p.id === myPlayerId);
  const alivePlayers = state.players.filter(p => p.isAlive);

  useEffect(() => {
    if (!me) return;
    if (myRole !== Role.DETECTIVE) return;
    const unsub = RoomService.subscribeToDetectiveResult(roomCode, state.round, myPlayerId, setDetectiveResult);
    return () => unsub();
  }, [me?.id, myRole, roomCode, state.round, myPlayerId]);

  const phaseRole = useMemo(() => {
    return state.phase === GamePhase.NIGHT_KILLER ? Role.KILLER
      : state.phase === GamePhase.NIGHT_DETECTIVE ? Role.DETECTIVE
      : state.phase === GamePhase.NIGHT_ANGEL ? Role.ANGEL
      : null;
  }, [state.phase]);

  const amActor = !!me && me.isAlive && phaseRole !== null && myRole === phaseRole;

  const actorsInPhase = useMemo(() => {
    if (!phaseRole) return [];
    if (!rolesMap) return amActor ? [me].filter(Boolean) as Player[] : [];
    return nightActorsForRole(state.players, phaseRole, rolesMap);
  }, [phaseRole, rolesMap, state.players, amActor, me]);

  const votes = state.nightActions || {};
  const totalActors = actorsInPhase.length || (amActor ? 1 : 0);
  const actorIds = useMemo(() => actorsInPhase.map((player) => player.id), [actorsInPhase]);
  const actedCount = actorIds.filter((actorId) => Boolean(votes[actorId])).length;
  const selectionsByTarget = useMemo(
    () => nightSelectionsByTarget(votes, actorIds),
    [votes, actorIds],
  );
  const showTeamDetails = amActor && (phaseRole === Role.KILLER || phaseRole === Role.DETECTIVE);
  const completedTeamSelections = myRole === Role.KILLER
    ? state.nightSelectionHistory?.KILLER
    : myRole === Role.DETECTIVE
      ? state.nightSelectionHistory?.DETECTIVE
      : undefined;

  const consensusTargetId = useMemo(() => {
    const targets = Object.values(votes);
    if (!targets.length) return null;
    const first = targets[0];
    return targets.every(t => t === first) ? first : null;
  }, [votes]);

  const handleSelect = async (targetId: string) => {
    if (!amActor || !phaseRole) return;

    const kind = phaseRole === Role.KILLER ? 'KILL'
      : phaseRole === Role.DETECTIVE ? 'CHECK'
      : 'SAVE';

    await RoomService.submitNightIntent(roomCode, state.round, myPlayerId, {
      kind,
      targetId,
      ts: Date.now()
    });

    setFeedback('Choice submitted. Awaiting consensus…');
  };

  if (!me) {
    return <div style={{ padding: 16 }}>Reconnecting…</div>;
  }

  const details = phaseRole ? ROLE_DETAILS[phaseRole] : null;

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-serif font-bold mb-3 text-slate-200">Night Falls</h2>
        {details && (
          <p className="text-slate-400">
            {details.card} phase — {amActor ? 'choose a target' : 'waiting for others'}
          </p>
        )}
        {totalActors > 0 && (
          <p className="text-slate-500 mt-2">Actions received: {actedCount}/{totalActors}</p>
        )}
        {showTeamDetails && (
          <div className="max-w-xl mx-auto mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              {phaseRole === Role.KILLER ? 'Kings' : 'Jacks'} acting tonight
            </p>
            <p className="text-slate-200">
              {actorsInPhase.map((actor) => actor.id === myPlayerId ? `${actor.name} (you)` : actor.name).join(', ')}
            </p>
          </div>
        )}
        {consensusTargetId && (
          <p className="text-green-400 mt-2">Consensus reached.</p>
        )}
      </div>

      {feedback && (
        <div className="max-w-xl mx-auto mb-6 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200">
          {feedback}
        </div>
      )}

      {!amActor && completedTeamSelections && (
        <div className="max-w-xl mx-auto mb-6 bg-slate-900 border border-amber-500/30 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Your team’s completed choices</p>
          <div className="space-y-1 text-slate-200">
            {Object.entries(completedTeamSelections).map(([actorId, targetId]) => {
              const actor = state.players.find((player) => player.id === actorId);
              const target = state.players.find((player) => player.id === targetId);
              return <p key={actorId}>{actor?.name || 'A teammate'} selected {target?.name || 'an unknown player'}.</p>;
            })}
          </div>
        </div>
      )}

      {myRole === Role.DETECTIVE && detectiveResult && state.phase === GamePhase.NIGHT_DETECTIVE && (
        <div className="max-w-xl mx-auto mb-6 bg-slate-900 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-200">
            Your check: {detectiveResult.isKiller ? (
              <span className="text-red-400 font-semibold">KILLER detected</span>
            ) : (
              <span className="text-blue-300 font-semibold">Not a killer</span>
            )}
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {alivePlayers
          .filter(p => phaseRole === Role.ANGEL || p.id !== myPlayerId)
          .map(p => {
            const selectedByMe = votes[myPlayerId] === p.id;
            const selectingActors = (selectionsByTarget[p.id] || [])
              .map((actorId) => actorsInPhase.find((actor) => actor.id === actorId))
              .filter(Boolean) as Player[];
            const canSelect = phaseRole
              ? canSelectNightTarget(state.players, phaseRole, myPlayerId, p.id, state.lastAngelSavedId, actorIds)
              : false;
            return (
              <div key={p.id} className={`p-4 rounded-2xl border ${selectedByMe ? 'border-yellow-400/60 bg-yellow-950/20' : 'border-slate-700 bg-slate-900/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-200">
                      {p.name}{p.isComputer && <span className="ml-2 text-xs font-bold uppercase text-amber-400">Computer</span>}
                      {p.id === myPlayerId && <span className="ml-2 text-xs font-bold uppercase text-indigo-400">You</span>}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {p.id === state.lastAngelSavedId && phaseRole === Role.ANGEL ? 'Saved last night' : 'Alive'}
                    </p>
                    {showTeamDetails && selectingActors.length > 0 && (
                      <p className="text-amber-300 text-sm mt-2">
                        Selected by {selectingActors.map((actor) => actor.id === myPlayerId ? 'you' : actor.name).join(', ')}
                      </p>
                    )}
                  </div>
                  {amActor && canSelect && (
                    <Button onClick={() => handleSelect(p.id)}>
                      Select
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {!amActor && (
        <p className="text-center text-slate-500 italic mt-10">
          You are not acting in this phase.
        </p>
      )}
    </div>
  );
};

export default NightPhase;
