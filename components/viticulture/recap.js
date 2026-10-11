import { Dialog } from "../ui/table-shell";
import { typeLabel } from "./pieces.js";

const list = (values) => (values.length ? values.join(" ") : "–");

function changes(before, after) {
  return Object.keys(after).map((type) => ({ type, from: before[type] ?? [], to: after[type] })).filter((row) => row.from.length || row.to.length);
}

/**
 * What a year end did: income paid, what aged, and who scored. Year end is one
 * step with no pause, so this is how the table sees it. Nobody has to dismiss
 * it before the next spring can be played.
 */
export default function RecapSheet({ room, playerId, onClose }) {
  const recap = room.yearRecap;
  if (!recap) return null;
  const mine = recap.players.find((entry) => entry.id === playerId);
  return <Dialog labelledBy="viti-recap-title" onClose={onClose} className="viti-recap">
    <p className="viti-kicker">Year {recap.year} is over</p>
    <h2 id="viti-recap-title">The vintage ages</h2>
    <div className="viti-recap-rows">
      {recap.players.map((entry) => {
        const player = room.players.find((item) => item.id === entry.id);
        return <div key={entry.id} className={entry.id === playerId ? "is-me" : ""}>
          <span style={{ "--player": player.color }}><i />{player.name}{entry.id === playerId ? " (you)" : ""}</span>
          <b>+{entry.income} coins</b>
          <small>{entry.scoreChange > 0 ? `+${entry.scoreChange} VP this year` : "No VP this year"}</small>
        </div>;
      })}
    </div>
    {mine && <div className="viti-recap-aging">
      <h3>Your cellar</h3>
      {[...changes(mine.grapes.before, mine.grapes.after).map((row) => ({ ...row, label: `${typeLabel(row.type)} grapes` })), ...changes(mine.wines.before, mine.wines.after).map((row) => ({ ...row, label: `${typeLabel(row.type)} wine` }))].map((row) => <p key={row.label}><span>{row.label}</span><b>{list(row.from)} → {list(row.to)}</b></p>)}
      {!changes(mine.grapes.before, mine.grapes.after).length && !changes(mine.wines.before, mine.wines.after).length && <p>Nothing in the cellar yet.</p>}
    </div>}
    <div className="tbl-modal-actions"><button type="button" className="tbl-primary" onClick={onClose}>On to year {recap.year + 1}</button></div>
  </Dialog>;
}
