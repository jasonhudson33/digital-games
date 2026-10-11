import React, { useState } from 'react';
import { GameHeader } from '../../components/ui/table-shell';
import MafiaRules from './MafiaRules';
import { GamePhase } from '../types';

interface GameBarProps {
  roomCode: string;
  phase: GamePhase;
  round?: number;
  isLeaving: boolean;
  onLeave: () => void;
}

/** What the table is doing, in the words the game bar shows. */
export const PHASE_STATUS: Record<string, string> = {
  [GamePhase.SETUP]: 'Setting up roles',
  [GamePhase.ROLE_REVEAL]: 'Role reveal',
  [GamePhase.NIGHT_TRANSITION]: 'Night falls',
  [GamePhase.NIGHT_KILLER]: 'Night: the Killers choose',
  [GamePhase.NIGHT_DETECTIVE]: 'Night: the Detective investigates',
  [GamePhase.NIGHT_ANGEL]: 'Night: the Angel protects',
  [GamePhase.DAY_RESULTS]: 'Dawn',
  [GamePhase.DAY_DELIBERATION]: 'Day: deliberation',
  [GamePhase.DAY_VOTING]: 'Day: voting',
  [GamePhase.GAME_OVER]: 'Game over',
};

/** The shared game bar for every in-game phase, with the Rules dialog it opens. */
const GameBar: React.FC<GameBarProps> = ({ roomCode, phase, round, isLeaving, onLeave }) => {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <>
      <GameHeader
        title="Mafia"
        room={{ roomCode }}
        subtitle={round ? `Room ${roomCode} · Round ${round}` : `Room ${roomCode}`}
        status={isLeaving ? 'Leaving…' : PHASE_STATUS[phase] ?? ''}
        onRules={() => setRulesOpen(true)}
        onLeave={onLeave}
      />
      {rulesOpen && <MafiaRules onClose={() => setRulesOpen(false)} />}
    </>
  );
};

export default GameBar;
