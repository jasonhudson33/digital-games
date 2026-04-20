import React, { useState } from 'react';
import Button from './Button';

interface LandingProps {
  initialName?: string;
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
}

const Landing: React.FC<LandingProps> = ({ initialName = '', onCreate, onJoin }) => {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  return (
    <div className="max-w-md mx-auto bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
          <svg className="w-10 h-10 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M11 7H13V13H11V7M11 15H13V17H11V15Z" />
          </svg>
        </div>
        <h2 className="text-3xl font-serif font-bold text-white mb-2">Welcome, Stranger</h2>
        <p className="text-slate-400">Enter your name to step into the shadows.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Your Identity</label>
          <input
            type="text"
            placeholder="e.g. Inspector Noir"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {!isJoining ? (
          <div className="space-y-3">
            <Button fullWidth onClick={() => onCreate(name)} disabled={!name.trim()}>Create New Room</Button>
            <Button fullWidth variant="ghost" onClick={() => setIsJoining(true)}>Join Existing Room</Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Room Code</label>
              <input
                type="text"
                placeholder="4-CHAR CODE"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-center font-mono text-2xl tracking-widest placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2">
              <Button fullWidth onClick={() => onJoin(name, code)} disabled={!name.trim() || code.length < 4}>Join Game</Button>
              <Button variant="secondary" onClick={() => setIsJoining(false)}>Back</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
