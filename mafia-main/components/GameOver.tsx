
import React from 'react';
import { Player, RoleMap, Role } from '../types';
import Button from './Button';
import { ROLE_DETAILS } from '../constants';

interface GameOverProps {
  winner: 'CITIZENS' | 'KILLERS' | null;
  players: Player[];
  revealedRoles?: RoleMap;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, players, revealedRoles, onRestart }) => {
  const isKillerWin = winner === 'KILLERS';

  return (
    <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in duration-700">
      <div className={`text-center mb-12 p-10 rounded-3xl border-4 ${isKillerWin ? 'bg-red-950/20 border-red-500/50 shadow-red-500/20' : 'bg-blue-950/20 border-blue-500/50 shadow-blue-500/20'} shadow-2xl`}>
        <h2 className="text-2xl font-serif text-slate-400 mb-2 tracking-widest uppercase">Game Over</h2>
        <h1 className={`text-6xl font-serif font-black ${isKillerWin ? 'text-red-500' : 'text-blue-500'} mb-4`}>
          {isKillerWin ? 'KILLERS WIN' : 'CITIZENS WIN'}
        </h1>
        <p className="text-slate-300 italic max-w-sm mx-auto">
          {isKillerWin 
            ? "The town has fallen into chaos. The killers remain undetected." 
            : "Justice has been served. The threat to the village is gone."}
        </p>
      </div>

      <div className="w-full mb-12">
        <h3 className="text-xl font-serif font-bold text-slate-400 mb-6 border-b border-slate-800 pb-2">Role Recap</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(player => {
            const role = revealedRoles?.[player.id] || Role.CITIZEN;
            const roleInfo = ROLE_DETAILS[role];
            const cid = player.cardCode.replace(/^0/, 'T');
            return (
              <div 
                key={player.id} 
                className={`p-4 rounded-xl border flex items-center gap-4 ${player.isAlive ? 'border-slate-700 bg-slate-800/40' : 'border-slate-800 bg-slate-900/40 opacity-50'}`}
              >
                <div className="w-14 h-20 rounded bg-white overflow-hidden flex-shrink-0 border border-slate-600 flex items-center justify-center p-1">
                  <playing-card cid={cid} bordercolor="#334155" shadow="1,2,2" class="w-full h-full" />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{player.name}</span>
                    {!player.isAlive && <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full border border-red-800/50">DEAD</span>}
                  </div>
                  <div className={`text-xs font-serif font-bold uppercase ${roleInfo.color}`}>{roleInfo.card}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button variant="primary" className="px-12 py-4" onClick={onRestart}>Play Again</Button>
    </div>
  );
};

export default GameOver;
