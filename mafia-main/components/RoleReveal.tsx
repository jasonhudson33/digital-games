import React, { useState } from 'react';
import { Player, Role } from '../types';
import { ROLE_DETAILS } from '../constants';
import Button from './Button';
import { RoomService } from '../services/RoomService';

interface RoleRevealProps {
  player: Player;
  myRole: Role;
  players: Player[];
  roomCode: string;
  round: number;
  onComplete: () => void; // host-only transition
  isHost: boolean;
}

const RoleReveal: React.FC<RoleRevealProps> = ({ player, myRole, players, roomCode, round, onComplete, isHost }) => {
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(!!player.isReady);

  const details = ROLE_DETAILS[myRole];

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
      <div className={`text-center mb-10 p-10 rounded-3xl border-4 ${details.borderColor} ${details.bgColor} shadow-2xl max-w-xl w-full`}>
        <h2 className="text-2xl font-serif text-slate-400 mb-3 tracking-widest uppercase">Your Role</h2>
        <h1 className={`text-6xl font-serif font-black mb-6 ${details.color}`}>{details.card}</h1>
        <p className="text-xl text-slate-200 leading-relaxed">{details.description}</p>
      </div>

      {!hasAcknowledged ? (
        <Button onClick={handleAcknowledge}>I Understand</Button>
      ) : (
        <p className="text-slate-400 italic">Acknowledged. Waiting for others… ({readyCount}/{players.length})</p>
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
