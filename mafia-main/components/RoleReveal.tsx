import React, { useState } from 'react';
import { Player, Role } from '../types';
import { ROLE_DETAILS } from '../constants';
import Button from './Button';
import { RoomService } from '../services/RoomService';
import { displayCardCode } from '../services/CardState';

interface RoleRevealProps {
  player: Player;
  myRole: Role;
  players: Player[];
  roomCode: string;
  round: number;
  onComplete: () => void; // host-only transition
  isHost: boolean;
  teammates?: Player[];
}

const RoleReveal: React.FC<RoleRevealProps> = ({ player, myRole, players, roomCode, round, onComplete, isHost, teammates = [] }) => {
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(!!player.isReady);

  const details = ROLE_DETAILS[myRole];
  const cardCode = displayCardCode(player.cardCode, myRole);

  const handleAcknowledge = async () => {
    try {
      setHasAcknowledged(true);
      await RoomService.submitReady(roomCode, round, player.id);
    } catch (e) {
      console.error(e);
      setHasAcknowledged(false);
      alert('Failed to acknowledge. Please try again.');
    }
  };

  const readyCount = players.filter(p => p.isReady).length;
  const allReady = readyCount === players.length;

  return (
    <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in duration-700">
      {!hasAcknowledged && (
        <div className={`text-center mb-10 p-10 rounded-3xl border-4 ${details.borderColor} ${details.bgColor} shadow-2xl max-w-xl w-full`}>
          <h2 className="text-2xl font-serif text-slate-400 mb-3 tracking-widest uppercase">Your Role</h2>
          <div
            className="w-44 mx-auto mb-7 overflow-hidden rounded-xl bg-white border border-slate-600 shadow-2xl"
            style={{ aspectRatio: '240 / 334' }}
            aria-label={`Your assigned card is ${cardCode}`}
          >
            <playing-card cid={cardCode} bordercolor="#334155" shadow="2,4,3" class="w-full h-full" />
          </div>
          <h1 className={`text-6xl font-serif font-black mb-6 ${details.color}`}>{details.card}</h1>
          <p className="text-xl text-slate-200 leading-relaxed">{details.description}</p>
          {myRole === Role.KILLER && (
            <div className="mt-7 rounded-2xl border border-red-500/30 bg-slate-950/50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">Your fellow Kings</p>
              <p className="text-lg text-slate-100">
                {teammates.length ? teammates.map((teammate) => teammate.name).join(', ') : 'You are the only King.'}
              </p>
            </div>
          )}
        </div>
      )}

      {!hasAcknowledged ? (
        <Button onClick={handleAcknowledge}>I Understand</Button>
      ) : (
        <div className="max-w-xl w-full rounded-3xl border border-slate-700 bg-slate-900/70 p-10 text-center shadow-2xl" aria-live="polite">
          <h2 className="text-3xl font-serif font-bold text-slate-100 mb-3">Role Hidden</h2>
          <p className="text-slate-400 italic">Acknowledged. Waiting for others… ({readyCount}/{players.length})</p>
        </div>
      )}

      {isHost && (
        <div className="mt-10 text-center">
          {allReady ? (
            <Button onClick={onComplete}>Begin Night</Button>
          ) : (
            <p className="text-slate-500 italic">Waiting for everyone to acknowledge…</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleReveal;
