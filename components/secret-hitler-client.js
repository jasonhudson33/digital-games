"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Crown,
  Eye,
  Gavel,
  RotateCcw,
  Shield,
  Skull,
  UserPlus,
  Vote,
  X,
} from "lucide-react";
import { eligibleChancellorIndices, getSecretHitlerPower } from "../lib/secret-hitler";
import { SecretHitlerRoomService } from "./secret-hitler-room-service";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby } from "./ui/table-shell";
import { computerDelayOf, computerSpeedProp } from "../lib/computer-speed.js";
import { useComputerPacer } from "../lib/use-computer-pacer.js";

const NAME_KEY = "secret-hitler-player-name";

export default function SecretHitlerClient() {
  const [ready, setReady] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [token, setToken] = useState("");
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  // The host's browser paces the computers by the room's speed (platform/computer-pacing).
  useComputerPacer({
    enabled: Boolean(game?.hostControls),
    due: Boolean(game?.computerDue),
    delayMs: computerDelayOf(game),
    step: () => action("computerStep"),
    key: game?.updatedAt,
  });
  // Props for the speed control in the bar and lobby (null when no computer is seated).
  const computerSpeed = computerSpeedProp({ players: game?.players, delayMs: game?.computerDelayMs, onChange: (ms) => action("setComputerSpeed", { ms }) });

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


  const rulesDialog = <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />;

  if (!game) {
    return <SharedLanding
      gameName="Secret Hitler"
      theme="tbl-light secret-hitler-theme"
      hero={<Hero
        kicker="A game of hidden loyalties"
        title={<>Trust no one.<br /><em>Elect someone.</em></>}
        copy="Build a room of five to ten players, mix humans with computer opponents, and govern from one shared tabletop."
        badges={[{ icon: UserPlus, label: "5–10 players" }, { icon: Bot, label: "Computer opponents" }, { icon: Eye, label: "Private roles" }]}
        artLayout="free"
        art={<section className="sh-party-preview" aria-label="The two parties">
          <div><span className="sh-mini-emblem liberal"><Shield size={26} /></span><strong>The Liberals</strong><p>Enact five Liberal policies or find and execute Hitler.</p></div>
          <div><span className="sh-mini-emblem fascist"><Skull size={26} /></span><strong>The Fascists</strong><p>Enact six Fascist policies or elect Hitler at the right moment.</p></div>
        </section>}
      />}
      entry={{ name: playerName, setName: setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (game.phase === "lobby") {
    const me = game.players.find((player) => player.isViewer) ?? game.players[0];
    const missing = 5 - game.players.length;
    return <SharedLobby computerSpeed={computerSpeed}
      gameName="Secret Hitler"
      theme="tbl-light secret-hitler-theme"
      room={{ roomCode: game.roomCode, hostId: game.hostControls ? me.playerId : game.players[0].playerId, players: game.players.map((player) => ({ ...player, id: player.playerId })) }}
      me={{ id: me.playerId }}
      busy={busy}
      error={error}
      min={5}
      max={10}
      seatNote={missing > 0 ? `Need ${missing} more ${missing === 1 ? "player" : "players"}` : "Ready to deal secret roles"}
      onAdd={() => action("addComputer")}
      onRemove={(id) => action("removeComputer", { playerId: id })}
      onStart={() => action("start")}
      onLeave={leaveRoom}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
  }

  return (
    <main className="sh-app sh-game tbl-light secret-hitler-theme">
      <GameHeader computerSpeed={computerSpeed}
        title="Secret Hitler"
        room={game}
        subtitle={`Government ${game.turnNumber} · ${game.players.filter((player) => player.alive).length} alive`}
        status={game.message ?? ""}
        actions={<>
          <button type="button" className="tbl-header-action role-reminder" onClick={() => setRoleOpen(true)}><Eye aria-hidden="true" /><span className="tbl-header-action-label">My role</span></button>
        </>}
        onRules={() => setRulesOpen(true)}
        onLeave={leaveRoom}
      />
      <Table game={game} busy={busy} action={action} />
      {error && <div className="sh-toast" role="alert">{error}</div>}
      <RoleDialog game={game} open={roleOpen} busy={busy} onClose={() => game.privateRole?.acknowledged && setRoleOpen(false)} onAcknowledge={async () => { await action("acknowledgeRole"); setRoleOpen(false); }} />
      {rulesDialog}
    </main>
  );
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
    return <div className="sh-action-panel"><span className="sh-phase-label">Legislative session</span><h2>{vetoDecision ? "Veto requested" : isActor ? (isPresidentTurn ? "Discard one policy, President" : "Choose a policy to enact, Chancellor") : `${game.players[isPresidentTurn ? game.presidentIndex : game.nominatedIndex].name} is reviewing policies`}</h2>{vetoDecision ? <div className="sh-vote-buttons compact"><button className="ja" onClick={() => action("answerVeto", { accept: true })}>Accept veto</button><button className="nein" onClick={() => action("answerVeto", { accept: false })}>Reject veto</button></div> : isActor ? <><div className="sh-policy-hand">{game.legislativeHand.map((policy, index) => <button className={`sh-policy-card ${policy}`} key={`${policy}-${index}`} disabled={busy || game.vetoRequested} onClick={() => action(isPresidentTurn ? "presidentDiscard" : "chancellorDiscard", { cardIndex: isPresidentTurn ? index : index === 0 ? 1 : 0 })}><span>{policy === "liberal" ? <Shield size={34} /> : <Skull size={34} />}</span><strong>{policy}</strong><small>{isPresidentTurn ? "Discard this policy" : "Enact this policy"}</small></button>)}</div>{!isPresidentTurn && game.fascistPolicies >= 5 && !game.vetoRequested && <button className="sh-veto-button" onClick={() => action("requestVeto")}>Request a veto</button>}</> : <div className="sh-card-backs">{game.legislativeHand.map((_, index) => <span key={index}>POLICY</span>)}</div>}</div>;
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
  return <ChoiceModal
    title={roleLabel(role)}
    text={role === "liberal" ? "Build trust carefully. Enact five Liberal policies or help execute Hitler." : role === "hitler" ? "Stay hidden. Your team wins if you are elected Chancellor after three Fascist policies—or if six Fascist policies pass." : "Protect Hitler, sow doubt, and guide six Fascist policies onto the board."}
    onClose={acknowledged ? onClose : undefined}
  >
    <p className="tbl-rule-heading">Your secret role · {party}</p>
    {game.privateRole.knownTeam.length > 0
      ? <div className="sh-known-team"><span>You recognize</span>{game.privateRole.knownTeam.map((member) => <div key={member.index}><strong>{member.name}</strong><small>{roleLabel(member.role)}</small></div>)}</div>
      : role === "hitler" && game.players.length >= 7
        ? <div className="sh-unknown-team"><Eye size={19} /><span>With 7–10 players, Hitler does not know who the Fascists are.</span></div>
        : <div className="sh-unknown-team"><Shield size={19} /><span>You have no confirmed teammates.</span></div>}
    {acknowledged
      ? <p className="sh-reminder-note">This information is hidden again when you close it. Use “My role” anytime you need a reminder.</p>
      : <button type="button" className="tbl-primary" disabled={busy} onClick={onAcknowledge}><Check size={18} /> I understand — hide my role</button>}
  </ChoiceModal>;
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return <ChoiceModal wide title="How to play" text="Field guide." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Nominate &amp; vote</b><p>The President nominates a Chancellor. Every living player votes Ja or Nein. A tied vote fails.</p></article>
      <article><b>Pass a policy</b><p>The President discards one of three policies. The Chancellor discards one of the remaining two; the last is enacted.</p></article>
      <article><b>Use new powers</b><p>Fascist policies unlock investigations, a policy peek, a special election, executions, and eventually veto power.</p></article>
      <article><b>Win the state</b><p>Liberals win with five policies or Hitler’s execution. Fascists win with six policies, or by electing Hitler Chancellor after three Fascist policies.</p></article>
    </div>
    <p className="tbl-modal-copy">After three failed elections, the top policy is enacted automatically and term limits reset. In a 5–6 player game Hitler recognizes the Fascist; with 7–10, Hitler begins in the dark.</p>
  </ChoiceModal>;
}

function roleLabel(role) {
  return role === "hitler" ? "Hitler" : role === "fascist" ? "Fascist" : "Liberal";
}

function tokenKey(code) { return `secret-hitler-token-${code}`; }
