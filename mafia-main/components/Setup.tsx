import React, { useState } from 'react';
import { Role, Player, RoleMap } from '../types';
import Button from './Button';

interface SetupProps {
  players: Player[];
  onStart: (players: Player[], roles: RoleMap, trialLimit: number) => void;
}

const Setup: React.FC<SetupProps> = ({ players, onStart }) => {
  const numPlayers = players.length;
  const [roleCounts, setRoleCounts] = useState({
    [Role.KILLER]: 1,
    [Role.DETECTIVE]: 1,
    [Role.ANGEL]: 1,
  });
  const [trialLimit, setTrialLimit] = useState(2);

  const updateRoleCount = (role: Role, count: number) => {
    const totalOthers = (Object.entries(roleCounts) as [Role, number][])
      .filter(([r]) => r !== role)
      .reduce((sum, [_, c]) => sum + c, 0);
    
    const maxForThisRole = numPlayers - totalOthers - 1; // Always at least 1 citizen
    const clampedCount = Math.max(0, Math.min(count, maxForThisRole));
    
    setRoleCounts({ ...roleCounts, [role]: clampedCount });
  };

  const totalSpecial = (Object.values(roleCounts) as number[]).reduce((a, b) => a + b, 0);
  const citizenCount = numPlayers - totalSpecial;

  const handleStart = () => {
    // Prepare Card Pools
    const suits = ['S', 'H', 'D', 'C'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '0']; 
    
    const killerPool = suits.map(s => `K${s}`).sort(() => Math.random() - 0.5);
    const detectivePool = suits.map(s => `J${s}`).sort(() => Math.random() - 0.5);
    const angelPool = suits.map(s => `A${s}`).sort(() => Math.random() - 0.5);
    const citizenPool: string[] = [];
    
    suits.forEach(s => {
      ranks.forEach(r => citizenPool.push(`${r}${s}`));
    });
    citizenPool.sort(() => Math.random() - 0.5);

    // Assign Roles
    const rolesToAssign: Role[] = [];
    for (let i = 0; i < roleCounts[Role.KILLER]; i++) rolesToAssign.push(Role.KILLER);
    for (let i = 0; i < roleCounts[Role.DETECTIVE]; i++) rolesToAssign.push(Role.DETECTIVE);
    for (let i = 0; i < roleCounts[Role.ANGEL]; i++) rolesToAssign.push(Role.ANGEL);
    while (rolesToAssign.length < numPlayers) rolesToAssign.push(Role.CITIZEN);
    
    rolesToAssign.sort(() => Math.random() - 0.5);

    const roles: RoleMap = {};
    const updatedPlayers: Player[] = players.map((p, i) => {
      const role = rolesToAssign[i];
      roles[p.id] = role;

      let cardCode = '';
      if (role === Role.KILLER) cardCode = killerPool.pop() || citizenPool.pop() || 'KS';
      else if (role === Role.DETECTIVE) cardCode = detectivePool.pop() || citizenPool.pop() || 'JS';
      else if (role === Role.ANGEL) cardCode = angelPool.pop() || citizenPool.pop() || 'AS';
      else cardCode = citizenPool.pop() || '2S';

      return { ...p, cardCode };
    });

    onStart(updatedPlayers, roles, trialLimit);
  };

  return (
    <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-serif font-bold text-white mb-2">Role Configuration</h2>
        <p className="text-slate-400">Distribute powers among the {numPlayers} players</p>
      </div>
      
      <div className="space-y-4 mb-10">
        <RoleRow label="Kings (Killers)" count={roleCounts[Role.KILLER]} onChange={(c) => updateRoleCount(Role.KILLER, c)} color="text-red-500" />
        <RoleRow label="Jacks (Detectives)" count={roleCounts[Role.DETECTIVE]} onChange={(c) => updateRoleCount(Role.DETECTIVE, c)} color="text-blue-500" />
        <RoleRow label="Aces (Angels)" count={roleCounts[Role.ANGEL]} onChange={(c) => updateRoleCount(Role.ANGEL, c)} color="text-yellow-500" />
        
        <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center px-4">
          <span className="text-slate-400 font-medium">Citizens (Numbered)</span>
          <span className="text-2xl font-bold text-slate-300">{citizenCount}</span>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700/50">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Trial Configuration</h3>
           <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
             <div>
                <span className="font-bold text-slate-100 block">Trial Limit</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Max candidates per day</span>
             </div>
             <div className="flex items-center gap-4">
               <button onClick={() => setTrialLimit(Math.max(1, trialLimit - 1))} className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl">-</button>
               <span className="w-4 text-center font-bold">{trialLimit}</span>
               <button onClick={() => setTrialLimit(Math.min(numPlayers, trialLimit + 1))} className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl">+</button>
             </div>
           </div>
        </div>
      </div>

      <Button fullWidth onClick={handleStart} className="py-4 text-lg">Deal the Cards</Button>
    </div>
  );
};

const RoleRow: React.FC<{label: string, count: number, onChange: (c: number) => void, color: string}> = ({ label, count, onChange, color }) => (
  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
    <span className={`font-bold ${color}`}>{label}</span>
    <div className="flex items-center gap-4">
      <button onClick={() => onChange(count - 1)} className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl">-</button>
      <span className="w-4 text-center font-bold">{count}</span>
      <button onClick={() => onChange(count + 1)} className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl">+</button>
    </div>
  </div>
);

export default Setup;