import React, { useState } from 'react';
import { Landing as SharedLanding, Hero } from '../../components/ui/table-shell';
import MafiaRules from './MafiaRules';

interface LandingProps {
  initialName?: string;
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
  connectionError?: string | null;
  connectionReady?: boolean;
}

/** Mafia's landing: the shared entry card, wired to its Supabase room calls. */
const Landing: React.FC<LandingProps> = ({ initialName = '', onCreate, onJoin, connectionError, connectionReady = false }) => {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [hint, setHint] = useState('');

  const create = () => {
    if (!name.trim()) return setHint('Enter your name first.');
    setHint('');
    onCreate(name);
  };
  const join = () => {
    if (!name.trim() || code.trim().length < 4) return setHint('Enter your name and a room code.');
    setHint('');
    onJoin(name, code.trim());
  };

  return (
    <SharedLanding
      gameName="Mafia"
      theme="mafia-theme"
      hero={<Hero
        kicker="A game of hidden roles"
        title={<>Welcome,<br /><em>Stranger.</em></>}
        copy="Enter your name to step into the shadows. Deal secret roles, survive the night, and vote out the Killers before they take the town."
        badges={[{ label: '5+ players' }, { label: 'Computer seats' }, { label: 'Night and day' }]}
      />}
      entry={{
        name,
        setName,
        joinCode: code,
        setJoinCode: setCode,
        createRoom: create,
        joinRoom: join,
        busy: !connectionReady && !connectionError,
        error: connectionError || hint,
      }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesOpen && <MafiaRules onClose={() => setRulesOpen(false)} />}
    />
  );
};

export default Landing;
