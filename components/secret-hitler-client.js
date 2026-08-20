"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  BookOpen,
  Check,
  Copy,
  Crown,
  DoorOpen,
  Eye,
  Gavel,
  Plus,
  RotateCcw,
  Shield,
  Skull,
  UserPlus,
  Vote,
  X,
} from "lucide-react";
import { eligibleChancellorIndices, getSecretHitlerPower } from "../lib/secret-hitler";
import { SecretHitlerRoomService } from "./secret-hitler-room-service";

const NAME_KEY = "secret-hitler-player-name";

export default function SecretHitlerClient() {
  const [ready, setReady] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [token, setToken] = useState("");
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const latestGame = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.toUpperCase() || "";
    setPlayerName(localStorage.getItem(NAME_KEY) || "");
    setJoinCode(code);
    setToken(code ? sessionStorage.getItem(tokenKey(code)) || "" : "");
    setReady(true);
  }, []);

  useEffect(() => { latestGame.current = game; }, [game]);

  useEffect(() => {
    if (!ready || game || !joinCode || !token) return;
    let cancelled = false;
    void SecretHitlerRoomService.load(joinCode, token).then((state) => {
      if (!cancelled) enterState(state);
    }).catch(() => {
      sessionStorage.removeItem(tokenKey(joinCode));
      setToken("");
    });
    return () => { cancelled = true; };
  }, [ready, game, joinCode, token]);

  useEffect(() => {
    if (!game?.roomCode || !token) return undefined;
    return SecretHitlerRoomService.subscribe(game.roomCode, token, enterState);
  }, [game?.roomCode, token]);

  useEffect(() => {
    if (game?.phase === "role_reveal" && !game.privateRole?.acknowledged) setRoleOpen(true);
  }, [game?.phase, game?.privateRole?.acknowledged]);

  function enterState(state) {
    setGame((current) => !current || state.updatedAt >= current.updatedAt ? state : current);
    latestGame.current = state;
  }

  function useName() {
    const clean = playerName.trim() || "Player";
    localStorage.setItem(NAME_KEY, clean);
    setPlayerName(clean);
    return clean;
  }

  function enterRoom(payload) {
    sessionStorage.setItem(tokenKey(payload.state.roomCode), payload.token);
    setToken(payload.token);
    setJoinCode(payload.state.roomCode);
    enterState(payload.state);
    window.history.replaceState(null, "", `/secret-hitler?room=${payload.state.roomCode}`);
  }

  async function createRoom() {
    await perform(async () => enterRoom(await SecretHitlerRoomService.create(useName())));
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code first.");
    await perform(async () => enterRoom(await SecretHitlerRoomService.join(code, useName())));
  }

  async function action(name, values = {}) {
    const current = latestGame.current;
    if (!current?.roomCode || !token) return;
    await perform(async () => enterState(await SecretHitlerRoomService.action(current.roomCode, token, name, values)));
  }

  async function perform(work) {
    setBusy(true);
    setError("");
    try { await work(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  function leaveRoom() {
    if (game?.roomCode) sessionStorage.removeItem(tokenKey(game.roomCode));
    setGame(null);
    latestGame.current = null;
    setToken("");
    setJoinCode("");
    setRoleOpen(false);
    setError("");
    window.history.replaceState(null, "", "/secret-hitler");
  }

  function copyInvite() {
    if (!game?.roomCode) return;
    void navigator.clipboard.writeText(`${window.location.origin}/secret-hitler?room=${game.roomCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!game) return <Landing {...{ playerName, setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, rulesOpen, setRulesOpen }} />;
  if (game.phase === "lobby") return <Lobby {...{ game, action, copyInvite, copied, leaveRoom, busy, error, rulesOpen, setRulesOpen }} />;

  return (
    <main className="sh-app sh-game">
      <GameHeader game={game} copied={copied} onCopy={copyInvite} onRole={() => setRoleOpen(true)} onRules={() => setRulesOpen(true)} onLeave={leaveRoom} />
      <Table game={game} busy={busy} action={action} />
      {error && <div className="sh-toast" role="alert">{error}</div>}
      <RoleDialog game={game} open={roleOpen} busy={busy} onClose={() => game.privateRole?.acknowledged && setRoleOpen(false)} onAcknowledge={async () => { await action("acknowledgeRole"); setRoleOpen(false); }} />
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function Landing({ playerName, setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, rulesOpen, setRulesOpen }) {
  return (
    <main className="sh-app sh-landing">
      <section className="sh-hero">
        <div className="sh-hero-copy">
          <span className="sh-overline"><Shield size={15} /> A game of hidden loyalties</span>
          <h1>Trust no one.<br /><em>Elect someone.</em></h1>
          <p>Build a room of five to ten players, mix humans with computer opponents, and govern from one shared tabletop.</p>
          <button className="sh-link-button" type="button" onClick={() => setRulesOpen(true)}><BookOpen size={17} /> How to play</button>
        </div>
        <div className="sh-entry-card">
          <div className="sh-seal" aria-hidden="true"><Gavel size={34} /></div>
          <h2>Take your seat</h2>
          <label><span>Your name</span><input value={playerName} maxLength={18} placeholder="Player" onChange={(event) => setPlayerName(event.target.value)} /></label>
          <button className="sh-primary" type="button" disabled={busy} onClick={createRoom}><Plus size={18} /> Create a room</button>
          <div className="sh-divider"><span>or join an existing table</span></div>
          <div className="sh-join-row">
            <input aria-label="Room code" value={joinCode} maxLength={5} placeholder="ROOM CODE" onChange={(event) => setJoinCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && joinRoom()} />
            <button type="button" disabled={busy} onClick={joinRoom}><UserPlus size={17} /> Join</button>
          </div>
          {error && <p className="sh-form-error" role="alert">{error}</p>}
          <small>5–10 players · private roles · shared live board</small>
        </div>
      </section>
      <section className="sh-party-preview" aria-label="The two parties">
        <div><span className="sh-mini-emblem liberal"><Shield size={26} /></span><strong>The Liberals</strong><p>Enact five Liberal policies or find and execute Hitler.</p></div>
        <div><span className="sh-mini-emblem fascist"><Skull size={26} /></span><strong>The Fascists</strong><p>Enact six Fascist policies or elect Hitler at the right moment.</p></div>
      </section>
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function Lobby({ game, action, copyInvite, copied, leaveRoom, busy, error, rulesOpen, setRulesOpen }) {
  const canStart = game.players.length >= 5;
  return (
    <main className="sh-app sh-lobby-shell">
      <header className="sh-lobby-header"><div><span className="sh-overline">Cabinet room</span><h1>Assemble the government.</h1></div><button className="sh-icon-text" type="button" onClick={leaveRoom}><DoorOpen size={17} /> Leave</button></header>
      <section className="sh-lobby-grid">
        <div className="sh-room-card">
          <span>Room code</span><strong>{game.roomCode}</strong>
          <button type="button" onClick={copyInvite}><Copy size={17} /> {copied ? "Invite copied" : "Copy invite link"}</button>
          <p>Friends can join this room from their own device. Every screen stays synced to the same tabletop.</p>
        </div>
        <div className="sh-seats-card">
          <div className="sh-card-heading"><div><span>Players</span><h2>{game.players.length} / 10 seats</h2></div>{game.hostControls && game.players.length < 10 && <button type="button" disabled={busy} onClick={() => action("addComputer")}><Bot size={17} /> Add computer</button>}</div>
          <div className="sh-seat-list">
            {game.players.map((player, index) => <div className="sh-lobby-seat" key={player.playerId}><span className="sh-avatar">{player.isComputer ? <Bot size={18} /> : player.name.charAt(0).toUpperCase()}</span><div><strong>{player.name}</strong><small>{player.isViewer ? "You" : player.isComputer ? "Computer player" : "Human player"}{index === 0 ? " · Host" : ""}</small></div>{game.hostControls && player.isComputer && <button aria-label={`Remove ${player.name}`} type="button" onClick={() => action("removeComputer", { playerId: player.playerId })}><X size={16} /></button>}</div>)}
            {Array.from({ length: Math.max(0, 5 - game.players.length) }, (_, index) => <div className="sh-lobby-seat empty" key={`empty-${index}`}><span className="sh-avatar">+</span><div><strong>Open seat</strong><small>Invite a friend or add a computer</small></div></div>)}
          </div>
          {game.hostControls ? <button className="sh-primary sh-start" type="button" disabled={busy || !canStart} onClick={() => action("start")}><Gavel size={18} /> {canStart ? "Deal secret roles" : `Need ${5 - game.players.length} more ${5 - game.players.length === 1 ? "player" : "players"}`}</button> : <p className="sh-waiting">Waiting for the host to start the game…</p>}
          {error && <p className="sh-form-error" role="alert">{error}</p>}
        </div>
      </section>
      <button className="sh-link-button lobby-rules" type="button" onClick={() => setRulesOpen(true)}><BookOpen size={17} /> Review the rules</button>
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function GameHeader({ game, copied, onCopy, onRole, onRules, onLeave }) {
  return <header className="sh-gamebar"><div className="sh-wordmark"><span><Gavel size={19} /></span><strong>Secret Hitler</strong></div><div className="sh-game-meta"><span>Room {game.roomCode}</span><i /><span>Government {game.turnNumber}</span><i /><span>{game.players.filter((player) => player.alive).length} alive</span></div><div className="sh-game-actions"><button onClick={onCopy}><Copy size={16} /> {copied ? "Copied" : "Invite"}</button><button className="role-reminder" onClick={onRole}><Eye size={16} /> My role</button><button onClick={onRules}><BookOpen size={16} /> Rules</button><button onClick={onLeave}><DoorOpen size={16} /> Leave</button></div></header>;
}

function Table({ game, busy, action }) {
  const viewer = game.viewerPlayerIndex;
  return (
    <div className="sh-table-wrap">
      <section className="sh-policy-board" aria-label="Shared policy board">
        <PolicyTrack party="liberal" count={game.liberalPolicies} total={5} playerCount={game.players.length} />
        <div className="sh-election-meter"><span>Failed elections</span><div>{[1, 2, 3].map((number) => <i key={number} className={game.electionTracker >= number ? "filled" : ""}>{number}</i>)}</div><small>Third failure enacts the top policy</small></div>
        <PolicyTrack party="fascist" count={game.fascistPolicies} total={6} playerCount={game.players.length} />
      </section>
      <section className="sh-tabletop">
        <div className="sh-players" aria-label="Players at the table">
          {game.players.map((player, index) => <PlayerSeat key={player.playerId} player={player} index={index} game={game} />)}
        </div>
        <div className="sh-center-table">
          <div className="sh-status"><span className="sh-status-dot" /><strong>{game.message}</strong></div>
          <ActionPanel game={game} viewer={viewer} busy={busy} action={action} />
          <div className="sh-decks" aria-label="Policy cards remaining"><div className="sh-policy-stack"><span>POLICY</span><i>{game.policyDeck.length}</i></div><div><strong>Draw pile</strong><small>{game.policyDeck.length} cards · {game.discardPile.length} discarded</small></div></div>
        </div>
      </section>
      <aside className="sh-history"><strong>Table record</strong>{(game.history || []).slice(0, 4).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</aside>
    </div>
  );
}

function PlayerSeat({ player, index, game }) {
  const isPresident = game.presidentIndex === index && game.phase !== "game_over";
  const isChancellor = game.nominatedIndex === index && !["nomination", "game_over"].includes(game.phase);
  const vote = game.votes[index];
  return <div className={`sh-player-seat ${player.isViewer ? "viewer" : ""} ${!player.alive ? "dead" : ""} ${isPresident ? "president" : ""}`}><div className="sh-player-top"><span className="sh-player-avatar">{player.isComputer ? <Bot size={18} /> : player.name.charAt(0).toUpperCase()}</span><div><strong>{player.name}</strong><small>{player.isViewer ? "You" : player.isComputer ? "Computer" : "Human"}</small></div></div><div className="sh-seat-badges">{isPresident && <span className="president-badge"><Crown size={12} /> President</span>}{isChancellor && <span className="chancellor-badge"><Gavel size={12} /> Chancellor</span>}{vote && <span className={`vote-badge ${vote === "nein" ? "nein" : ""}`}><Vote size={12} /> {vote === true ? "Voted" : vote.toUpperCase()}</span>}{!player.alive && <span className="dead-badge"><Skull size={12} /> Executed</span>}{game.phase === "role_reveal" && player.roleAcknowledged && <span className="ready-badge"><Check size={12} /> Ready</span>}{game.phase === "game_over" && <span className={`${player.party}-badge`}>{roleLabel(player.role)}</span>}</div></div>;
}

function ActionPanel({ game, viewer, busy, action }) {
  if (game.phase === "role_reveal") {
    const ready = game.players.filter((player) => player.roleAcknowledged).length;
    return <div className="sh-action-panel quiet"><Eye size={30} /><h2>Roles are being reviewed</h2><p>{ready} of {game.players.length} players have acknowledged their role.</p></div>;
  }
  if (game.phase === "nomination") {
    const isPresident = game.presidentIndex === viewer;
    const eligible = new Set(eligibleChancellorIndices(game));
    return <div className="sh-action-panel"><span className="sh-phase-label">Nomination</span><h2>{isPresident ? "Choose a Chancellor" : `${game.players[game.presidentIndex].name} is choosing a Chancellor`}</h2>{isPresident ? <div className="sh-candidate-grid">{game.players.map((player, index) => eligible.has(index) && <button key={player.playerId} disabled={busy} onClick={() => action("nominate", { targetIndex: index })}><span>{player.name.charAt(0)}</span>{player.name}<small>{player.isComputer ? "Computer" : "Player"}</small></button>)}</div> : <p className="sh-muted">The Presidential Candidate controls this choice.</p>}</div>;
  }
  if (game.phase === "election") {
    const hasVoted = Boolean(game.votes[viewer]);
    const alive = game.players[viewer].alive;
    return <div className="sh-action-panel"><span className="sh-phase-label">National election</span><h2>{game.players[game.presidentIndex].name} + {game.players[game.nominatedIndex].name}</h2><p>Vote on the proposed government. Ballots are revealed together.</p>{alive && !hasVoted ? <div className="sh-vote-buttons"><button className="ja" disabled={busy} onClick={() => action("vote", { vote: "ja" })}><Check size={21} /> JA!</button><button className="nein" disabled={busy} onClick={() => action("vote", { vote: "nein" })}><X size={21} /> NEIN!</button></div> : <div className="sh-ballot-wait"><Vote size={22} /> {hasVoted ? "Your ballot is locked. Waiting for the table…" : "Executed players do not vote."}</div>}</div>;
  }
  if (game.phase === "president_discard" || game.phase === "chancellor_discard") {
    const isPresidentTurn = game.phase === "president_discard";
    const isActor = isPresidentTurn ? game.presidentIndex === viewer : game.nominatedIndex === viewer;
    const vetoDecision = !isPresidentTurn && game.vetoRequested && game.presidentIndex === viewer;
    return <div className="sh-action-panel"><span className="sh-phase-label">Legislative session</span><h2>{vetoDecision ? "Veto requested" : isActor ? `Discard one policy, ${isPresidentTurn ? "President" : "Chancellor"}` : `${game.players[isPresidentTurn ? game.presidentIndex : game.nominatedIndex].name} is reviewing policies`}</h2>{vetoDecision ? <div className="sh-vote-buttons compact"><button className="ja" onClick={() => action("answerVeto", { accept: true })}>Accept veto</button><button className="nein" onClick={() => action("answerVeto", { accept: false })}>Reject veto</button></div> : isActor ? <><div className="sh-policy-hand">{game.legislativeHand.map((policy, index) => <button className={`sh-policy-card ${policy}`} key={`${policy}-${index}`} disabled={busy || game.vetoRequested} onClick={() => action(isPresidentTurn ? "presidentDiscard" : "chancellorDiscard", { cardIndex: index })}><span>{policy === "liberal" ? <Shield size={34} /> : <Skull size={34} />}</span><strong>{policy}</strong><small>Discard this policy</small></button>)}</div>{!isPresidentTurn && game.fascistPolicies >= 5 && !game.vetoRequested && <button className="sh-veto-button" onClick={() => action("requestVeto")}>Request a veto</button>}</> : <div className="sh-card-backs">{game.legislativeHand.map((_, index) => <span key={index}>POLICY</span>)}</div>}</div>;
  }
  if (game.phase === "executive_action") return <ExecutivePanel game={game} viewer={viewer} busy={busy} action={action} />;
  if (game.phase === "game_over") return <div className={`sh-action-panel sh-game-over ${game.winner}`}><span className="sh-win-icon">{game.winner === "liberal" ? <Shield size={42} /> : <Skull size={42} />}</span><span className="sh-phase-label">Game over</span><h2>The {game.winner === "liberal" ? "Liberals" : "Fascists"} win</h2><p>{game.winReason}</p>{game.hostControls && <button className="sh-primary" disabled={busy} onClick={() => action("reset")}><RotateCcw size={17} /> Return to lobby</button>}</div>;
  return null;
}

function ExecutivePanel({ game, viewer, busy, action }) {
  const power = game.executiveAction?.type;
  const isPresident = game.presidentIndex === viewer;
  const result = game.executiveAction?.result;
  const title = { "policy-peek": "Policy peek", investigate: "Investigate loyalty", "special-election": "Call a special election", execution: "Executive action" }[power];
  if (!isPresident) return <div className="sh-action-panel quiet"><Crown size={30} /><span className="sh-phase-label">Presidential power</span><h2>{title}</h2><p>{game.players[game.presidentIndex].name} is resolving this power in private.</p></div>;
  if (power === "policy-peek") return <div className="sh-action-panel"><span className="sh-phase-label">Private information</span><h2>The next three policies</h2><div className="sh-policy-hand small">{result.map((policy, index) => <div className={`sh-policy-card ${policy}`} key={`${policy}-${index}`}><span>{policy === "liberal" ? <Shield size={27} /> : <Skull size={27} />}</span><strong>{policy}</strong></div>)}</div><button className="sh-primary sh-done" disabled={busy} onClick={() => action("finishPower")}>I’ll remember</button></div>;
  if (power === "investigate" && result) return <div className="sh-action-panel"><span className="sh-phase-label">Confidential result</span><h2>{game.players[game.executiveAction.targetIndex].name} is a <em className={result}>{result}</em></h2><p>You learn party membership, not a specific role.</p><button className="sh-primary sh-done" onClick={() => action("finishPower")}>Close the dossier</button></div>;
  const candidates = game.players.flatMap((player, index) => player.alive && index !== viewer ? [{ ...player, index }] : []);
  return <div className="sh-action-panel"><span className="sh-phase-label">Presidential power</span><h2>{title}</h2><p>{power === "investigate" ? "Choose one player to see their party membership." : power === "special-election" ? "Choose any living player to be the next Presidential Candidate." : "Choose one player to execute. This decision is final."}</p><div className="sh-candidate-grid">{candidates.map((player) => <button key={player.playerId} disabled={busy} onClick={() => action("usePower", { targetIndex: player.index })}><span>{player.name.charAt(0)}</span>{player.name}<small>{power === "execution" ? "Execute" : "Select"}</small></button>)}</div></div>;
}

function PolicyTrack({ party, count, total, playerCount }) {
  return <div className={`sh-track ${party}`}><div className="sh-track-heading"><span>{party === "liberal" ? <Shield size={22} /> : <Skull size={22} />}</span><div><strong>{party} policies</strong><small>{count} of {total} enacted</small></div></div><div className="sh-track-spaces">{Array.from({ length: total }, (_, index) => { const number = index + 1; const power = party === "fascist" ? getSecretHitlerPower(playerCount, number) : null; return <i key={number} className={number <= count ? "filled" : ""}>{number <= count ? (party === "liberal" ? <Shield size={17} /> : <Skull size={17} />) : <PowerGlyph power={power} />}</i>; })}</div></div>;
}

function PowerGlyph({ power }) {
  if (!power) return <span />;
  return <small title={power}>{power === "execution" ? "☠" : power === "investigate" ? "🔎" : power === "special-election" ? "★" : "3"}</small>;
}

function RoleDialog({ game, open, busy, onClose, onAcknowledge }) {
  if (!open || !game.privateRole) return null;
  const role = game.privateRole.role;
  const party = game.privateRole.party;
  const acknowledged = game.privateRole.acknowledged;
  return <div className="sh-modal-backdrop" role="presentation"><section className={`sh-modal sh-role-card ${party}`} role="dialog" aria-modal="true" aria-labelledby="role-title"><div className="sh-role-crest">{party === "liberal" ? <Shield size={48} /> : <Skull size={48} />}</div>{acknowledged && <button className="sh-modal-close" aria-label="Close role reminder" onClick={onClose}><X size={20} /></button>}<span className="sh-overline">Your secret role</span><h2 id="role-title">{roleLabel(role)}</h2><p>{role === "liberal" ? "Build trust carefully. Enact five Liberal policies or help execute Hitler." : role === "hitler" ? "Stay hidden. Your team wins if you are elected Chancellor after three Fascist policies—or if six Fascist policies pass." : "Protect Hitler, sow doubt, and guide six Fascist policies onto the board."}</p>{game.privateRole.knownTeam.length > 0 ? <div className="sh-known-team"><span>You recognize</span>{game.privateRole.knownTeam.map((member) => <div key={member.index}><strong>{member.name}</strong><small>{roleLabel(member.role)}</small></div>)}</div> : role === "hitler" && game.players.length >= 7 ? <div className="sh-unknown-team"><Eye size={19} /><span>With 7–10 players, Hitler does not know who the Fascists are.</span></div> : <div className="sh-unknown-team"><Shield size={19} /><span>You have no confirmed teammates.</span></div>}{acknowledged ? <p className="sh-reminder-note">This information is hidden again when you close it. Use “My role” anytime you need a reminder.</p> : <button className="sh-primary" disabled={busy} onClick={onAcknowledge}><Check size={18} /> I understand — hide my role</button>}</section></div>;
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return <div className="sh-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="sh-modal sh-rules" role="dialog" aria-modal="true" aria-labelledby="rules-title"><button className="sh-modal-close" aria-label="Close rules" onClick={onClose}><X size={20} /></button><span className="sh-overline">Field guide</span><h2 id="rules-title">How to play</h2><div className="sh-rules-grid"><div><b>1</b><section><strong>Nominate & vote</strong><p>The President nominates a Chancellor. Every living player votes Ja or Nein. A tied vote fails.</p></section></div><div><b>2</b><section><strong>Pass a policy</strong><p>The President discards one of three policies. The Chancellor discards one of the remaining two; the last is enacted.</p></section></div><div><b>3</b><section><strong>Use new powers</strong><p>Fascist policies unlock investigations, a policy peek, a special election, executions, and eventually veto power.</p></section></div><div><b>4</b><section><strong>Win the state</strong><p>Liberals win with five policies or Hitler’s execution. Fascists win with six policies, or by electing Hitler Chancellor after three Fascist policies.</p></section></div></div><div className="sh-rule-note"><Vote size={20} /><p>After three failed elections, the top policy is enacted automatically and term limits reset. In a 5–6 player game Hitler recognizes the Fascist; with 7–10, Hitler begins in the dark.</p></div></section></div>;
}

function roleLabel(role) {
  return role === "hitler" ? "Hitler" : role === "fascist" ? "Fascist" : "Liberal";
}

function tokenKey(code) { return `secret-hitler-token-${code}`; }
