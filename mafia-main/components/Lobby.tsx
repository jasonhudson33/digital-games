
import React from 'react';
import { Player } from '../types';
import Button from './Button';

interface LobbyProps {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  onStart: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ roomCode, players, isHost, onStart }) => {
  return (
    <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Game Lobby</h2>
        <p className="text-slate-400">Share the code below with your friends</p>
        <div className="mt-4 inline-block bg-indigo-600 px-8 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 border-2 border-indigo-400/50 transform hover:scale-105 transition-transform">
          <span className="text-4xl font-mono font-black tracking-[0.2em]">{roomCode}</span>
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Players ({players.length})</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Waiting...</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  {i + 1}
                </div>
                <span className="font-medium text-slate-100">{p.name}</span>
              </div>
              {p.isHost && (
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/30">HOST</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        {isHost ? (
          <Button onClick={onStart} disabled={players.length < 5} className="px-12 py-4 text-lg">
            Configure Roles
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 italic text-slate-400">
            Waiting for Host to start...
          </div>
        )}
        {isHost && players.length < 5 && (
          <p className="text-xs text-slate-500 mt-4 italic">Minimum 5 players required to start.</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;
