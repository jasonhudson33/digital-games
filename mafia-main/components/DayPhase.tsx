import React, { useState, useMemo, useEffect } from 'react';
import { GamePhase, GameState, Player } from '../types';
import Button from './Button';
import { RoomService } from '../services/RoomService';

interface DayPhaseProps {
  state: GameState;
  myPlayerId: string;
  onHostAction: (updates: Partial<GameState>) => void;
  isHost: boolean;
  roomCode: string;
}

const DayPhase: React.FC<DayPhaseProps> = ({ state, myPlayerId, onHostAction, isHost, roomCode }) => {
  const me = useMemo(() => state.players.find(p => p.id === myPlayerId), [state.players, myPlayerId]);
  const alivePlayers = useMemo(() => state.players.filter(p => p.isAlive), [state.players]);

  const nominations = state.nominations || {};
  const seconds = state.seconds || {};
  const dayVotes = state.dayVotes || {};

  const candidatesOnTrial = useMemo(() => {
    const uniqueNominated = new Set(Object.values(nominations));
    return Array.from(uniqueNominated).filter(targetId => {
      const seconderIds = seconds[targetId as string] || [];
      return seconderIds.length > 0;
    }) as string[];
  }, [nominations, seconds]);

  const checkEnd = (_players: Player[]): { winner: 'CITIZENS' | 'KILLERS' | null } => {
    // Winner is computed by the acting host using private roles.
    return { winner: null };
  };

  const handleAcknowledge = () => {
    const { winner } = checkEnd(state.players);
    if (winner) {
      onHostAction({ phase: GamePhase.GAME_OVER, winner });
    } else {
      onHostAction({ phase: GamePhase.DAY_DELIBERATION, nominations: {}, seconds: {}, dayVotes: {} });
    }
  };

  const handleStartVote = () => {
    onHostAction({ phase: GamePhase.DAY_VOTING, dayVotes: {} });
  };

    const handleCastVote = async (candidateId: string) => {
    // LOCK-IN: If user already voted, don't allow changes
    if (!me?.isAlive || dayVotes[myPlayerId]) return;

    await RoomService.submitDayIntent(roomCode, state.round, myPlayerId, { kind: 'VOTE', targetId: candidateId, ts: Date.now() });
  };

  const processResults = () => {
    const votes = Object.values(dayVotes);
    if (votes.length === 0) {
      onHostAction({ 
        phase: GamePhase.NIGHT_TRANSITION, 
        round: state.round + 1,
        nominations: {},
        seconds: {},
        dayVotes: {}
      });
      return;
    }

    const tally: Record<string, number> = {};
    candidatesOnTrial.forEach(id => tally[id] = 0);
    votes.forEach(id => {
      if (tally[id] !== undefined) tally[id]++;
    });

    const maxVotes = Math.max(...Object.values(tally));
    const winners = Object.keys(tally).filter(id => tally[id] === maxVotes);

    if (winners.length > 1) {
      // Tie! Revote on just the winners
      const tieNames = state.players.filter(p => winners.includes(p.id)).map(p => p.name).join(', ');
      alert(`The vote is tied between ${tieNames}! A runoff election will begin now.`);
      
      // Update nominations/seconds to only include tied players to restrict candidates
      const newNominations: Record<string, string> = {};
      const newSeconds: Record<string, string[]> = {};
      winners.forEach((id, idx) => {
        newNominations[`tie_${idx}`] = id;
        newSeconds[id] = ['tie_system'];
      });

      onHostAction({
        nominations: newNominations,
        seconds: newSeconds,
        dayVotes: {},
        phase: GamePhase.DAY_VOTING
      });
    } else {
      const votedOutId = winners[0];
      let updatedPlayers = state.players.map(p => 
        p.id === votedOutId ? { ...p, isAlive: false } : p
      );

      const { winner } = checkEnd(updatedPlayers);
      if (winner) {
        onHostAction({ players: updatedPlayers, phase: GamePhase.GAME_OVER, winner });
      } else {
        onHostAction({ 
          players: updatedPlayers, 
          phase: GamePhase.NIGHT_TRANSITION, 
          round: state.round + 1,
          nominations: {},
          seconds: {},
          dayVotes: {}
        });
      }
    }
  };

  // AUTO-RESOLUTION: Watch for all votes cast
  useEffect(() => {
    if (state.phase === GamePhase.DAY_VOTING && isHost) {
      const totalVotesCount = Object.keys(dayVotes).length;
      const totalAlive = alivePlayers.length;
      if (totalVotesCount > 0 && totalVotesCount === totalAlive) {
        // Short timeout to let the last voter see their selection reflected before the transition
        const timer = setTimeout(() => {
          processResults();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [dayVotes, isHost, alivePlayers.length, state.phase]);

  const handleSkipTrial = () => {
    onHostAction({ 
      phase: GamePhase.NIGHT_TRANSITION, 
      round: state.round + 1,
      nominations: {},
      seconds: {},
      dayVotes: {}
    });
  };

    const handleNominate = async (targetId: string) => {
    if (!me?.isAlive) return;
    // Only one nomination per player; host will enforce/aggregate
    await RoomService.submitDayIntent(roomCode, state.round, myPlayerId, { kind: 'NOMINATE', targetId, ts: Date.now() });
  };

    const handleRescind = async (targetId: string) => {
    if (!me?.isAlive) return;
    await RoomService.submitDayIntent(roomCode, state.round, myPlayerId, { kind: 'RESCIND', targetId, ts: Date.now() });
  };

    const handleSecond = async (targetId: string) => {
    if (!me?.isAlive) return;
    await RoomService.submitDayIntent(roomCode, state.round, myPlayerId, { kind: 'SECOND', targetId, ts: Date.now() });
  };

  if (state.phase === GamePhase.DAY_RESULTS) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-700 text-center">
        <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-yellow-500/40">
           <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7ZM12 5C8.13 5 5 8.13 5 12C5 15.87 8.13 19 12 19C15.87 19 19 15.87 19 12C19 8.13 15.87 5 12 5ZM12 2L14.39 5.42L11 7.33L12 2ZM12 22L9.61 18.58L13 16.67L12 22ZM2 12L5.42 9.61L7.33 13L2 12ZM22 12L18.58 14.39L16.67 11L22 12Z" />
           </svg>
        </div>
        <h2 className="text-5xl font-serif font-bold mb-8 text-yellow-500">Daylight Breaks</h2>
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-xl space-y-4">
          {(state.nightResults || []).map((result, i) => (
            <p key={i} className="text-xl text-slate-200">{result}</p>
          ))}
        </div>
        {isHost ? (
          <Button className="mt-12" onClick={handleAcknowledge}>Begin Deliberation</Button>
        ) : (
          <p className="mt-12 text-slate-500 italic">Waiting for host to acknowledge...</p>
        )}
      </div>
    );
  }

  if (state.phase === GamePhase.DAY_DELIBERATION) {
    const myNominationTargetId = nominations[myPlayerId];
    return (
      <div className="animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold text-white">Deliberation</h2>
            <p className="text-slate-400">Nominate and second suspects (Limit: {state.trialLimit}).</p>
          </div>
          <div className="text-right">
             <div className="text-indigo-400 font-bold text-2xl">Day {state.round}</div>
             <div className="text-xs text-slate-500 uppercase tracking-widest">Assembly</div>
          </div>
        </div>
        <div className="space-y-4 mb-12">
          {alivePlayers.map(p => {
            const nominatorId = Object.keys(nominations).find(nid => nominations[nid] === p.id);
            const nominator = state.players.find(pl => pl.id === nominatorId);
            const seconderIds = seconds[p.id] || [];
            const isNominated = !!nominatorId;
            const isSeconded = seconderIds.length > 0;
            const isMyNomination = nominatorId === myPlayerId;

            return (
              <div key={p.id} className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSeconded ? 'border-amber-500/40 bg-amber-950/10 shadow-lg shadow-amber-900/10' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="flex-grow">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-100">{p.name}</span>
                    {p.id === myPlayerId && <span className="text-[10px] font-bold text-indigo-400 border border-indigo-400/30 px-2 py-0.5 rounded uppercase tracking-tighter">You</span>}
                    {isSeconded && <span className="text-[10px] font-bold text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded uppercase tracking-tighter">On Trial</span>}
                  </div>
                  {isNominated && (
                    <div className="mt-2 text-xs text-slate-500">
                      Nominated by <span className="text-slate-300 font-bold">{nominator?.name}</span>
                      {isSeconded && <> • Seconded by <span className="text-amber-400 font-bold">{state.players.filter(pl => seconderIds.includes(pl.id)).map(s => s.name).join(', ')}</span></>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isMyNomination ? (
                    <Button variant="danger" className="text-xs py-2 px-4" onClick={() => handleRescind(p.id)}>Rescind</Button>
                  ) : !isNominated ? (
                    <Button disabled={!me?.isAlive || !!myNominationTargetId || p.id === myPlayerId} variant="ghost" className="text-xs py-2 px-4" onClick={() => handleNominate(p.id)}>Nominate</Button>
                  ) : (
                    <Button disabled={!me?.isAlive || myNominationTargetId === p.id || seconderIds.includes(myPlayerId) || (!isSeconded && candidatesOnTrial.length >= state.trialLimit)} variant={isSeconded ? 'secondary' : 'primary'} className="text-xs py-2 px-4" onClick={() => handleSecond(p.id)}>Second</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
             <div className="text-sm">
                <span className="text-slate-500 uppercase font-bold tracking-widest text-[10px] block mb-1">Trial Status</span>
                <span className="text-white font-bold">{candidatesOnTrial.length} / {state.trialLimit} Candidates</span>
             </div>
             {isHost && (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleSkipTrial}>Skip</Button>
                  <Button disabled={candidatesOnTrial.length === 0} onClick={handleStartVote}>Call Vote</Button>
                </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  const trialPlayers = state.players.filter(p => candidatesOnTrial.includes(p.id));
  const hasVoted = !!dayVotes[myPlayerId];
  const totalVotesCount = Object.keys(dayVotes).length;
  const voteProgress = (totalVotesCount / alivePlayers.length) * 100;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-serif font-bold text-white mb-2">The Trial</h2>
        <p className="text-slate-400">{hasVoted ? "Your vote is locked in. Waiting for the town..." : "Cast your vote for the person you want to eliminate."}</p>
        <div className="mt-6 w-full max-w-xs mx-auto bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
          <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${voteProgress}%` }}></div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-bold">{totalVotesCount} / {alivePlayers.length} Voted</p>
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        {trialPlayers.map(player => {
          const isMySelection = dayVotes[myPlayerId] === player.id;
          const voteCount = Object.values(dayVotes).filter(vid => vid === player.id).length;
          
          return (
            <button
              key={player.id}
              onClick={() => handleCastVote(player.id)}
              disabled={!me?.isAlive || hasVoted}
              className={`w-full p-6 rounded-2xl border-2 transition-all flex justify-between items-center group relative overflow-hidden
                ${isMySelection ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}
                ${hasVoted && !isMySelection ? 'opacity-50 grayscale-[0.5]' : ''}`}
            >
              <div className="relative z-10">
                <span className="text-2xl font-bold block text-left">{player.name}</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest text-left block">Trial Candidate</span>
              </div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="text-right">
                  <span className="text-2xl font-mono font-bold text-slate-300">{voteCount}</span>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Votes</span>
                </div>
                {isMySelection && (
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/30">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="absolute inset-y-0 left-0 bg-amber-500/5 transition-all duration-700 pointer-events-none" style={{ width: `${(voteCount / alivePlayers.length) * 100}%` }}></div>
            </button>
          );
        })}
        
        <div className="pt-10">
          {!me?.isAlive ? (
            <div className="text-center p-6 rounded-2xl bg-slate-800/30 border border-slate-700 italic text-slate-400">
              You are deceased. Watch the verdict unfold.
            </div>
          ) : !hasVoted ? (
            <p className="text-center text-slate-500 italic">Please select a candidate above.</p>
          ) : (
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Waiting for remaining votes
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayPhase;