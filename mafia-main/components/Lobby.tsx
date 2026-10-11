import React, { useState } from 'react';
import { Lobby as SharedLobby } from '../../components/ui/table-shell';
import MafiaRules from './MafiaRules';
import { Player } from '../types';

interface LobbyProps {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  myPlayerId: string | null;
  onStart: () => void;
  onAddComputer: () => void;
  onRemoveComputer: (playerId: string) => void;
  onLeave: () => void;
}

export const MIN_PLAYERS = 5;

/** Mafia's lobby: the shared lobby over its player list. */
const Lobby: React.FC<LobbyProps> = ({ roomCode, players, isHost, myPlayerId, onStart, onAddComputer, onRemoveComputer, onLeave }) => {
  const [rulesOpen, setRulesOpen] = useState(false);
  const hostId = isHost ? myPlayerId : players.find((player) => player.isHost)?.id;

  return (
    <SharedLobby
      gameName="Mafia"
      theme="mafia-theme"
      room={{
        roomCode,
        hostId: hostId ?? '',
        players: players.map((player) => ({ ...player, isComputer: Boolean(player.isComputer || player.isBot) })),
      }}
      me={{ id: myPlayerId ?? '' }}
      busy={false}
      error=""
      min={MIN_PLAYERS}
      max={Infinity}
      onAdd={onAddComputer}
      onRemove={onRemoveComputer}
      onStart={onStart}
      onLeave={onLeave}
      onRules={() => setRulesOpen(true)}
      rules={rulesOpen && <MafiaRules onClose={() => setRulesOpen(false)} />}
    />
  );
};

export default Lobby;
