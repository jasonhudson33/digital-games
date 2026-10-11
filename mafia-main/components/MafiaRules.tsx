import React from 'react';
import { ChoiceModal } from '../../components/ui/table-shell';

/** How to play Mafia, in the shared dialog. */
const MafiaRules: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ChoiceModal wide title="How to play Mafia" text="A game of hidden roles for five or more players." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Secret roles</b><p>Everyone is dealt a card. Killers know each other; the Detective, Angel and Citizens do not.</p></article>
      <article><b>Night</b><p>The Killers agree on a target, the Detective checks one player, and the Angel protects one player (never the same person twice running).</p></article>
      <article><b>Day</b><p>The table learns who was lost, deliberates, nominates and votes. The player with the most votes is out.</p></article>
      <article><b>Winning</b><p>Citizens win when every Killer is out. The Killers win when they equal or outnumber everyone else.</p></article>
    </div>
  </ChoiceModal>
);

export default MafiaRules;
