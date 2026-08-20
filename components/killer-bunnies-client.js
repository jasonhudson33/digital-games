"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen, Bot, Carrot, Coins, Copy, DoorOpen, Droplets, Layers3, Library,
  Leaf, PackageOpen, Play, Plus, Rabbit, Shield, Sparkles, Store, Target, Users, X,
} from "lucide-react";
import { bankTotal, getKaballasMarket, getKillerBunniesCardPlayStatus, getKillerBunniesFeedingStatus, getKillerBunniesPileStatus, getKillerBunniesShopItemStatus } from "../lib/killer-bunnies";
import { KILLER_BUNNIES_EXPANSIONS } from "../lib/killer-bunnies-expansions";
import { KillerBunniesRoomService } from "./killer-bunnies-room-service";

const NAME_KEY = "killer-bunnies-player-name";
const TOKEN_PREFIX = "killer-bunnies-room-token:";

export default function KillerBunniesClient() {
  const [ready, setReady] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const latestGame = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.toUpperCase() || "";
    setPlayerName(localStorage.getItem(NAME_KEY) || "");
    setJoinCode(code);
    setRoomToken(code ? localStorage.getItem(`${TOKEN_PREFIX}${code}`) || "" : "");
    setReady(true);
  }, []);

  useEffect(() => { latestGame.current = game; }, [game]);

  useEffect(() => {
    if (!ready || game || !joinCode || !roomToken) return;
    let cancelled = false;
    void KillerBunniesRoomService.load(joinCode, roomToken).then((state) => {
      if (!cancelled) setGame(state);
    }).catch((loadError) => {
      if (!cancelled) {
        localStorage.removeItem(`${TOKEN_PREFIX}${joinCode}`);
        setRoomToken("");
        setError(loadError instanceof Error ? loadError.message : "Could not reconnect to the room.");
      }
    });
    return () => { cancelled = true; };
  }, [ready, game, joinCode, roomToken]);

  useEffect(() => {
    if (!game?.roomCode || !roomToken) return undefined;
    return KillerBunniesRoomService.subscribe(game.roomCode, roomToken, (remote) => {
      setGame((current) => !current || remote.updatedAt >= current.updatedAt ? remote : current);
    });
  }, [game?.roomCode, roomToken]);

  function cleanName() {
    const value = playerName.trim().slice(0, 18) || "Player";
    localStorage.setItem(NAME_KEY, value);
    setPlayerName(value);
    return value;
  }

  function enterRoom(state, token) {
    localStorage.setItem(`${TOKEN_PREFIX}${state.roomCode}`, token);
    setRoomToken(token);
    setJoinCode(state.roomCode);
    setGame(state);
    latestGame.current = state;
    setError("");
    window.history.replaceState(null, "", `/killer-bunnies?room=${state.roomCode}`);
  }

  async function createRoom() {
    setBusy(true); setError("");
    try {
      const payload = await KillerBunniesRoomService.create(cleanName());
      enterRoom(payload.state, payload.token);
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "Could not create the room.");
    } finally { setBusy(false); }
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code first.");
    setBusy(true); setError("");
    try {
      const savedToken = localStorage.getItem(`${TOKEN_PREFIX}${code}`);
      if (savedToken) {
        try {
          const state = await KillerBunniesRoomService.load(code, savedToken);
          enterRoom(state, savedToken);
          return;
        } catch { localStorage.removeItem(`${TOKEN_PREFIX}${code}`); }
      }
      const payload = await KillerBunniesRoomService.join(code, cleanName());
      enterRoom(payload.state, payload.token);
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "Could not join the room.");
    } finally { setBusy(false); }
  }

  async function action(name, values = {}) {
    const current = latestGame.current;
    if (!current?.roomCode || !roomToken) return;
    setBusy(true); setError("");
    try {
      const next = await KillerBunniesRoomService.action(current.roomCode, roomToken, name, values);
      setGame(next);
      latestGame.current = next;
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "That move could not be completed.");
    } finally { setBusy(false); }
  }

  function copyInvite() {
    if (!game?.roomCode) return;
    void navigator.clipboard.writeText(`${window.location.origin}/killer-bunnies?room=${game.roomCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function leaveRoom() {
    setGame(null); latestGame.current = null; setRoomToken(""); setJoinCode(""); setError("");
    window.history.replaceState(null, "", "/killer-bunnies");
  }

  if (!ready) return <main className="kb-app"><div className="kb-loading">Opening the burrow…</div></main>;
  if (!game) return <Welcome name={playerName} setName={setPlayerName} joinCode={joinCode} setJoinCode={setJoinCode} busy={busy} error={error} onCreate={createRoom} onJoin={joinRoom} onRules={() => setRulesOpen(true)} rulesOpen={rulesOpen} onCloseRules={() => setRulesOpen(false)} />;
  if (game.phase === "lobby") return <Lobby game={game} error={error} busy={busy} copied={copied} onCopy={copyInvite} onAction={action} onLeave={leaveRoom} onRules={() => setRulesOpen(true)} rulesOpen={rulesOpen} onCloseRules={() => setRulesOpen(false)} />;

  return <GameTable game={game} error={error} busy={busy} copied={copied} onCopy={copyInvite} onAction={action} onLeave={leaveRoom} onRules={() => setRulesOpen(true)} rulesOpen={rulesOpen} onCloseRules={() => setRulesOpen(false)} />;
}

function Welcome({ name, setName, joinCode, setJoinCode, busy, error, onCreate, onJoin, onRules, rulesOpen, onCloseRules }) {
  return (
    <main className="kb-app kb-welcome-shell">
      <section className="kb-welcome">
        <div className="kb-welcome-copy">
          <span className="kb-kicker"><Sparkles size={15} /> An unofficial tabletop prototype</span>
          <h1>Killer Bunnies <em>&amp; the Magic Carrot</em></h1>
          <p>Queue your moves two turns ahead, keep a bunny alive, and collect the one carrot destiny decides is magic.</p>
          <div className="kb-count-strip" aria-label="Card set count">
            <span><b>1,485</b> numbered cards</span><span><b>24</b> published decks</span><span><b>2–8</b> players</span>
          </div>
          <label className="kb-name-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={18} placeholder="Carrot chaser" /></label>
          <div className="kb-room-actions">
            <button className="kb-primary" type="button" disabled={busy} onClick={onCreate}><Plus size={18} /> Create a room</button>
            <div className="kb-join">
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && onJoin()} maxLength={5} placeholder="ROOM CODE" aria-label="Room code" />
              <button type="button" disabled={busy} onClick={onJoin}><Users size={17} /> Join</button>
            </div>
          </div>
          {error && <p className="kb-error" role="alert">{error}</p>}
          <div className="kb-welcome-links"><button className="kb-link-button" type="button" onClick={onRules}><BookOpen size={16} /> See how this digital edition plays</button><a className="kb-link-button" href="/killer-bunnies/cards"><Library size={16} /> Review and update all 1,485 cards</a></div>
        </div>
        <div className="kb-hero-art" aria-hidden="true">
          <div className="kb-sun" /><div className="kb-hill hill-one" /><div className="kb-hill hill-two" />
          <div className="kb-hero-carrot"><Carrot /></div>
          <div className="kb-hero-bunny"><span className="ear left" /><span className="ear right" /><Rabbit /></div>
          <GameCard card={{ type: "RUN", kind: "bunny", catalogNumber: "0004", name: "Sinister Bunny – Blue", color: "blue", detail: "An official Blue Starter Deck bunny." }} className="hero-card card-one" />
          <GameCard card={{ type: "RUN", kind: "weapon", catalogNumber: "0031", name: "Kitchen Whisk – Weapon Level 1", power: 1, detail: "An official Blue Starter Deck weapon." }} className="hero-card card-two" />
        </div>
      </section>
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
    </main>
  );
}

function Lobby({ game, error, busy, copied, onCopy, onAction, onLeave, onRules, rulesOpen, onCloseRules }) {
  return (
    <main className="kb-app kb-lobby-shell">
      <section className="kb-lobby-card">
        <span className="kb-kicker"><Rabbit size={16} /> Assemble the Bunny Circle</span>
        <h1>Your room is <em>ready.</em></h1>
        <p>Invite human players with the room code, then fill any empty chairs with computers.</p>
        <div className="kb-room-code"><span>Room code</span><strong>{game.roomCode}</strong><button type="button" onClick={onCopy}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button></div>
        <div className="kb-player-list">
          {game.players.map((player, index) => (
            <div key={player.playerId}>
              <span className={`kb-avatar avatar-${index % 6}`}>{player.isComputer ? <Bot size={18} /> : player.name[0].toUpperCase()}</span>
              <strong>{player.name}{player.isViewer ? " (you)" : ""}</strong>
              <small>{index === 0 ? "Room host" : player.isComputer ? "Computer player" : "Human player"}</small>
              {game.hostControls && player.isComputer && <button type="button" onClick={() => onAction("removeComputer", { playerId: player.playerId })}><X size={14} /> Remove</button>}
            </div>
          ))}
        </div>
        {game.hostControls && game.players.length < 8 && <button className="kb-add-bot" type="button" disabled={busy} onClick={() => onAction("addComputer")}><Bot size={17} /> Add computer player</button>}
        <ExpansionSelector game={game} busy={busy} onAction={onAction} />
        <div className="kb-lobby-meta"><span>{game.expansionSummary.totalCards} numbered cards</span><span>{game.expansionSummary.packCount} expansions</span><span>{game.players.length}/8 seats</span></div>
        {game.hostControls ? <button className="kb-primary kb-start" type="button" disabled={busy || game.players.length < 2} onClick={() => onAction("start")}><Play size={18} /> Start the carrot hunt</button> : <p className="kb-waiting">Waiting for the host to start…</p>}
        {error && <p className="kb-error" role="alert">{error}</p>}
        <div className="kb-lobby-footer"><button type="button" onClick={onRules}><BookOpen size={16} /> Rules</button><button type="button" onClick={onLeave}><DoorOpen size={16} /> Leave room</button></div>
      </section>
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
    </main>
  );
}

function GameTable({ game, error, busy, copied, onCopy, onAction, onLeave, onRules, rulesOpen, onCloseRules }) {
  const [openingTopId, setOpeningTopId] = useState("");
  const [openingBottomId, setOpeningBottomId] = useState("");
  const viewerIndex = game.viewerPlayerIndex;
  const viewer = game.players[viewerIndex];
  const yourTurn = game.currentPlayerIndex === viewerIndex;
  const isOpeningTurn = yourTurn && game.phase === "setupRun";
  const isTrimTurn = yourTurn && game.phase === "trimHand";
  const canPlayTop = yourTurn && game.phase === "play";
  const isTargeting = yourTurn && game.phase === "target";
  const canChooseCarrot = yourTurn && game.phase === "chooseCarrot";
  const savedSpecials = viewer.savedSpecials || [];
  const mustDefend = game.phase === "defend" && game.pendingAction?.playerIndex === viewerIndex;
  const openingTopCard = viewer.hand.find((card) => card.id === openingTopId);
  const openingBottomCard = viewer.hand.find((card) => card.id === openingBottomId);
  const topRunStatus = getKillerBunniesCardPlayStatus(viewer, viewer.topRun);
  const topRunWillDiscard = canPlayTop && viewer.topRun && !topRunStatus.enabled;
  const market = getKaballasMarket(game);
  const supplyStatuses = {
    main: getKillerBunniesPileStatus(game, viewerIndex, "main"),
    cabbage: getKillerBunniesPileStatus(game, viewerIndex, "cabbage"),
    water: getKillerBunniesPileStatus(game, viewerIndex, "water"),
    carrot: getKillerBunniesPileStatus(game, viewerIndex, "carrot"),
    magic: getKillerBunniesPileStatus(game, viewerIndex, "magic"),
  };
  const opponents = game.players.map((player, index) => ({ player, index })).filter(({ index }) => index !== viewerIndex);

  useEffect(() => {
    setOpeningTopId("");
    setOpeningBottomId("");
  }, [game.phase, game.currentPlayerIndex]);

  function selectOpeningRunCard(cardId) {
    if (!isOpeningTurn || busy) return;
    if (openingTopId === cardId) {
      setOpeningTopId("");
      return;
    }
    if (openingBottomId === cardId) {
      setOpeningBottomId("");
      return;
    }
    if (!openingTopId) setOpeningTopId(cardId);
    else if (!openingBottomId) setOpeningBottomId(cardId);
  }

  function clickCarrot(card) {
    if (canChooseCarrot) onAction("chooseCarrot", { carrotId: card.id });
    else if (supplyStatuses.carrot.enabled) onAction("drawPile", { pile: "carrot", cardId: card.id });
  }

  return (
    <main className="kb-app kb-game-shell">
      <header className="kb-gamebar">
        <div className="kb-game-title"><span><Rabbit size={20} /></span><div><strong>Killer Bunnies</strong><small>Room {game.roomCode} · Turn {game.turnNumber} · {game.cardCounts.numbered} numbered cards · {game.expansionSummary?.packCount || 0} expansions</small></div></div>
        <div className="kb-game-actions"><button type="button" onClick={onCopy}><Copy size={15} /> {copied ? "Copied" : game.roomCode}</button><a href="/killer-bunnies/cards"><Library size={15} /> Update cards</a><button type="button" onClick={onRules}><BookOpen size={15} /> Rules</button><button type="button" onClick={onLeave}><DoorOpen size={15} /> Leave</button></div>
      </header>

      {!!game.expansionIds?.length && <section className="kb-active-expansions" aria-label="Active expansions"><span><PackageOpen size={13} /> ACTIVE PACKS</span>{game.expansionIds.map((id) => { const pack = KILLER_BUNNIES_EXPANSIONS.find((entry) => entry.id === id); return pack ? <i key={id} style={{ "--pack-color": pack.color }}>{pack.name.replace(" Booster", "")}</i> : null; })}</section>}

      <section className="kb-score-rail" aria-label="Players">
        {game.players.map((player, index) => (
          <div key={player.playerId} className={`kb-score ${game.currentPlayerIndex === index ? "active" : ""} ${player.isViewer ? "viewer" : ""}`}>
            <span className={`kb-avatar avatar-${index % 6}`}>{player.isComputer ? <Bot size={16} /> : player.name[0].toUpperCase()}</span>
            <span><strong>{player.name}</strong><small>{player.bunnies.length} bunnies · {player.carrots.length} carrots</small></span>
            <b>{bankTotal(player)}<Coins size={12} /></b>
          </div>
        ))}
      </section>

      <section className="kb-table" aria-label="Killer Bunnies tabletop">
        <div className="kb-opponents">
          {opponents.map(({ player, index }) => (
            <OpponentZone key={player.playerId} player={player} index={index} active={game.currentPlayerIndex === index} targetable={isTargeting} onTarget={(bunnyId) => onAction("targetBunny", { targetPlayerIndex: index, bunnyId })} />
          ))}
        </div>

        <div className="kb-felt-center">
          <div className={`kb-turn-message phase-${game.phase}`}><span>{game.phase === "setupRun" ? isOpeningTurn ? "PROGRAM YOUR RUN" : "OPENING SETUP" : mustDefend ? "ACTION NEEDED" : yourTurn ? "YOUR TURN" : `${game.players[game.currentPlayerIndex]?.name?.toUpperCase() || "GAME"}`}</span><p>{game.message}</p>{game.lastRoll && <b>d{game.lastRoll.sides}: {game.lastRoll.value}</b>}</div>

          <div className="kb-pile-row">
            <Pile title="Main draw" count={game.mainDeck.length} icon={<Layers3 />} tone="main" status={supplyStatuses.main} busy={busy} onClick={() => onAction("drawPile", { pile: "main" })} />
            <Pile title="Cabbage" count={game.cabbageSupply.length} icon={<Leaf />} tone="cabbage" status={supplyStatuses.cabbage} busy={busy} onClick={() => onAction("drawPile", { pile: "cabbage" })} />
            <Pile title="Water" count={game.waterSupply.length} icon={<Droplets />} tone="water" status={supplyStatuses.water} busy={busy} onClick={() => onAction("drawPile", { pile: "water" })} />
            <Pile title="Magic Carrot" count={game.magicCarrotDeck.length} icon={<Sparkles />} tone="magic" status={supplyStatuses.magic} busy={busy} onClick={() => onAction("drawPile", { pile: "magic" })} />
            <Pile title="Discard" count={game.discardPile.length} icon={<Layers3 />} tone="discard" status={{ enabled: false, reason: "Played cards rest here." }} busy />
          </div>

          <div className={`kb-market ${market.isOpen ? "open" : "closed"}`}>
            <KaballasMarketCard market={market} />
            <div className="kb-market-stock">
              <div className="kb-market-label"><span><Carrot size={17} /> Carrots for sale</span><small>{canChooseCarrot ? "Choose A Carrot works even while closed" : supplyStatuses.carrot.reason}</small></div>
              <div className="kb-carrot-row">
                {game.carrotMarket.map((carrotCard) => <button key={carrotCard.id} type="button" className={`kb-carrot-card carrot-${carrotCard.color}`} disabled={busy || (!canChooseCarrot && !supplyStatuses.carrot.enabled)} onClick={() => clickCarrot(carrotCard)}><Carrot /><b>{carrotCard.label}</b><span>{canChooseCarrot ? "TAKE" : market.prices.carrot}<Coins size={10} /></span></button>)}
                {!game.carrotMarket.length && <div className="kb-empty-market">The market is empty. Destiny is waiting.</div>}
              </div>
            </div>
          </div>

          {(game.rooneysEmporium || game.weilsPawnShop) && <div className="kb-expansion-shops">
            {game.rooneysEmporium && <RooneysEmporium store={game.rooneysEmporium} game={game} playerIndex={viewerIndex} busy={busy} onBuy={(item, cardId) => onAction("buyShopItem", { shop: "rooneys", item, cardId })} />}
            {game.weilsPawnShop && <WeilsPawnShop store={game.weilsPawnShop} game={game} playerIndex={viewerIndex} busy={busy} onBuy={(item, cardId) => onAction("buyShopItem", { shop: "weils", item, cardId })} />}
          </div>}
        </div>

        <div className="kb-log"><span>TABLE TALK</span>{game.log.slice(0, 5).map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</div>
      </section>

      <section className="kb-player-mat">
        <div className="kb-your-stats">
          <div><span className="kb-avatar avatar-0">{viewer.name[0].toUpperCase()}</span><span><strong>{viewer.name}</strong><small>{yourTurn ? "You're up" : `Waiting for ${game.players[game.currentPlayerIndex]?.name}`}</small></span></div>
          <div className="kb-resource-chips"><span><Coins /> {bankTotal(viewer)}</span><span><Leaf /> {viewer.cabbage.length}</span><span><Droplets /> {viewer.water.length}</span><span><Shield /> {viewer.shields}</span>{game.rooneysEmporium && <span><Shield /> {viewer.defenseCards?.reduce((total, card) => total + card.units, 0) || 0} DEF</span>}{game.weilsPawnShop && <span><Rabbit /> {viewer.pawns?.length || 0} pawns</span>}<span><Carrot /> {viewer.carrots.length}</span><span><Sparkles /> {savedSpecials.length}</span></div>
        </div>

        <FeedingObligations player={viewer} yourTurn={yourTurn} phase={game.phase} />

        {game.phase === "setupRun" && <div className={`kb-opening-setup ${isOpeningTurn ? "active" : "waiting"}`}><div><span className="kb-kicker"><Layers3 size={14} /> Opening program</span><strong>{isOpeningTurn ? "Pick your first two RUN cards" : `Waiting for ${game.players[game.currentPlayerIndex]?.name}`}</strong><p>{isOpeningTurn ? "Select TOP RUN first—the card that will play on your first turn—then select BOTTOM RUN for the following turn." : "You may review your hand while the current player finishes programming their RUN."}</p></div>{isOpeningTurn && <button className="kb-primary" type="button" disabled={busy || !openingTopId || !openingBottomId} onClick={() => onAction("chooseInitialRun", { topCardId: openingTopId, bottomCardId: openingBottomId })}><Play size={17} /> Confirm opening RUN</button>}</div>}

        <div className="kb-mat-grid">
          <div className="kb-bunny-circle"><label>BUNNY CIRCLE</label><div>{viewer.bunnies.map((bunny) => <MiniBunny key={bunny.id} bunny={bunny} />)}{!viewer.bunnies.length && <span className="kb-empty-slot"><Rabbit /> No living bunnies</span>}</div></div>
          <div className="kb-run-lane"><label>PROGRAMMED RUN</label><div className="kb-run-slots"><button className={`kb-run-card top ${canPlayTop ? "ready" : ""} ${topRunWillDiscard ? "needs-bunny" : ""} ${openingTopCard ? "opening-picked" : ""}`} type="button" disabled={!canPlayTop || busy || !viewer.topRun} onClick={() => onAction("playTopRun")} title={topRunWillDiscard ? `${topRunStatus.reason} Click to discard it.` : "Play your TOP RUN card."}><span>{game.phase === "setupRun" ? "TOP RUN · PLAYS FIRST" : topRunWillDiscard ? "TOP RUN · DISCARD — NEED BUNNY" : "TOP RUN · PLAY NOW"}</span>{openingTopCard ? <GameCard card={openingTopCard} compact /> : viewer.topRun ? <GameCard card={viewer.topRun} compact /> : <i>{isOpeningTurn ? "Choose first from hand" : "Not programmed"}</i>}{topRunWillDiscard && <i className="kb-bunny-required"><Rabbit /> Requires a living bunny</i>}</button><div className="kb-run-arrow">→</div><div className={`kb-run-card bottom ${openingBottomCard ? "opening-picked" : ""}`}><span>{game.phase === "setupRun" ? "BOTTOM RUN · PLAYS SECOND" : "BOTTOM RUN · NEXT"}</span>{openingBottomCard ? <GameCard card={openingBottomCard} compact /> : viewer.bottomRun ? <GameCard card={viewer.bottomRun} compact /> : <i className={(game.phase === "replace" && yourTurn) || (isOpeningTurn && openingTopId) ? "pulse" : ""}>{isOpeningTurn && openingTopId ? "Choose second from hand" : "Choose from hand"}</i>}</div></div></div>
          <div className="kb-collected"><label>YOUR CARROTS</label><div>{viewer.carrots.map((card) => <span key={card.id} className={`carrot-${card.color}`}><Carrot />{card.label}</span>)}{!viewer.carrots.length && <small>None yet</small>}</div></div>
        </div>

        <div className="kb-saved-area">
          <div className="kb-hand-heading"><span>SAVED SPECIALS · {savedSpecials.length} CARDS</span><b>Saved cards do not replace your normal TOP RUN play</b></div>
          <div className="kb-saved-cards">
            {savedSpecials.map((card) => {
              const playable = game.phase === "play" && (yourTurn || card.type === "VERY SPECIAL");
              return <button key={card.id} type="button" disabled={busy || !playable} onClick={() => onAction("playSaved", { cardId: card.id })} title={playable ? `Play ${card.name}` : card.type === "VERY SPECIAL" ? "Play while another player is choosing their TOP RUN action" : "Play on your turn"}><GameCard card={card} compact /></button>;
            })}
            {!savedSpecials.length && <span><Sparkles /> Run a SPECIAL or VERY SPECIAL card through BOTTOM and TOP RUN to save it here.</span>}
          </div>
        </div>

        <div className="kb-hand-area"><div className="kb-hand-heading"><span>YOUR HAND · {viewer.hand.length} CARDS</span>{isTrimTurn ? <b>Discard {viewer.hand.length - 5} extra card{viewer.hand.length - 5 === 1 ? "" : "s"}</b> : game.phase === "replace" && yourTurn ? <b>Choose one for BOTTOM RUN</b> : isOpeningTurn ? <b>{!openingTopId ? "Choose TOP RUN first" : !openingBottomId ? "Now choose BOTTOM RUN" : "Review and confirm your program"}</b> : null}</div><div className="kb-hand">{viewer.hand.map((card) => { const openingSlot = openingTopId === card.id ? "TOP · 1" : openingBottomId === card.id ? "BOTTOM · 2" : ""; return <button key={card.id} className={`${openingSlot ? "opening-selected" : ""} ${isTrimTurn ? "trim-choice" : ""}`} type="button" disabled={busy || (!isOpeningTurn && !isTrimTurn && (game.phase !== "replace" || !yourTurn))} onClick={() => isOpeningTurn ? selectOpeningRunCard(card.id) : isTrimTurn ? onAction("discardExtra", { cardId: card.id }) : onAction("replaceRun", { cardId: card.id })}>{openingSlot && <i className="kb-opening-badge">{openingSlot}</i>}<GameCard card={card} /></button>; })}</div></div>
      </section>

      {error && <div className="kb-toast" role="alert">{error}</div>}
      {game.phase === "specialChoice" && game.pendingAction?.playerIndex === viewerIndex && <SpecialChoiceDialog card={game.pendingAction.card} busy={busy} onChoice={(choice) => onAction("specialChoice", { choice })} />}
      {mustDefend && <DefenseDialog pending={game.pendingAction} player={viewer} busy={busy} onChoice={(choice) => onAction("resolveDefense", { choice })} />}
      {game.phase === "gameOver" && <div className="kb-result"><div><span className="kb-kicker"><Sparkles size={15} /> Magic Carrot {game.revealedMagicCarrot?.label}</span><h2>{game.winnerIndexes.length ? `${game.winnerIndexes.map((index) => game.players[index].name).join(" & ")} wins!` : "The carrot escaped!"}</h2><p>{game.message}</p><button className="kb-primary" type="button" onClick={onLeave}>Return to the burrow</button></div></div>}
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
    </main>
  );
}

function OpponentZone({ player, index, active, targetable, onTarget }) {
  const feedingCount = player.feedingObligations?.length || 0;
  return <article className={`kb-opponent ${active ? "active" : ""}`}><header><span className={`kb-avatar avatar-${index % 6}`}>{player.isComputer ? <Bot size={15} /> : player.name[0].toUpperCase()}</span><span><strong>{player.name}</strong><small>{player.handCount} cards · {player.carrots.length} carrots · {bankTotal(player)} bucks</small></span>{active && <i>TURN</i>}</header><div className="kb-opponent-runs"><span>{player.topRun ? "▰ TOP" : "□ TOP"}</span><span>{player.bottomRun ? "▰ BOTTOM" : "□ BOTTOM"}</span><span>✦ {player.savedSpecials?.length || 0} SAVED</span>{feedingCount > 0 && <span className="feeding">♨ {feedingCount} FEED DUE</span>}</div><div className="kb-opponent-bunnies">{player.bunnies.map((bunny) => <button type="button" key={bunny.id} disabled={!targetable} className={targetable ? "targetable" : ""} onClick={() => onTarget(bunny.id)}><MiniBunny bunny={bunny} />{targetable && <Target size={13} />}</button>)}{!player.bunnies.length && <small>No bunnies in circle</small>}</div></article>;
}

function FeedingObligations({ player, yourTurn, phase }) {
  const status = getKillerBunniesFeedingStatus(player);
  if (!status.obligations.length) return null;
  const canStillShop = yourTurn && phase === "play";
  return <section className={`kb-feeding-obligations ${status.canFeedAll ? "ready" : "short"}`} aria-label="Bunnies that must be fed">
    <header><span><Leaf /> FEEDING DUE</span><strong>{status.canFeedAll ? "Supplies ready" : `${status.cabbageShortfall} cabbage · ${status.waterShortfall} water still needed`}</strong></header>
    <p>{canStillShop ? "Buy missing Cabbage and Water from Kaballa’s Market before flipping TOP RUN." : yourTurn ? "Your shopping window has closed. These bunnies will be checked when your turn ends." : "You may buy the missing supplies during your next turn. Feeding is checked when that turn ends."}</p>
    <div>{status.obligations.map((obligation) => { const bunny = player.bunnies.find((entry) => entry.id === obligation.bunnyId); return <article key={obligation.id}><Rabbit /><span><b>{bunny?.name || "Targeted bunny"}</b><small>{obligation.card.name}</small></span><strong>{obligation.cabbageCost}<Leaf /> + {obligation.waterCost}<Droplets /></strong></article>; })}</div>
  </section>;
}

function SpecialChoiceDialog({ card, busy, onChoice }) {
  return <div className="kb-modal-backdrop"><section className="kb-special-choice" role="dialog" aria-modal="true" aria-labelledby="kb-special-choice-title"><GameCard card={card} /><div><span className="kb-kicker"><Sparkles size={15} /> TOP RUN special</span><h2 id="kb-special-choice-title">Use it or save it?</h2><p>Because this card completed the BOTTOM RUN → TOP RUN cycle, you may keep it face-up for later instead of resolving it now.</p><div><button className="kb-primary" type="button" disabled={busy} onClick={() => onChoice("save")}><PackageOpen size={17} /> Save for later</button><button type="button" disabled={busy} onClick={() => onChoice("use")}><Play size={17} /> Use now</button></div></div></section></div>;
}

function DefenseDialog({ pending, player, busy, onChoice }) {
  const bunny = player.bunnies.find((entry) => entry.id === pending.bunnyId);
  const isWeapon = pending.effect === "weapon";
  const cabbageCost = pending.card.cabbageCost || 0;
  const waterCost = pending.card.waterCost || 0;
  const canFeed = player.cabbage.length >= cabbageCost && player.water.length >= waterCost;
  const defenseUnits = player.defenseCards?.reduce((total, card) => total + card.units, 0) || 0;
  return <div className="kb-modal-backdrop"><section className="kb-defense-choice" role="dialog" aria-modal="true" aria-labelledby="kb-defense-title"><div className="kb-defense-cards"><GameCard card={pending.card} /><span><Target /> targets</span>{bunny && <div><MiniBunny bunny={bunny} /><b>{bunny.name}</b></div>}</div><div><span className="kb-kicker">{isWeapon ? <><Target size={15} /> Bunny under attack</> : <><Leaf size={15} /> Feeding required</>}</span><h2 id="kb-defense-title">{isWeapon ? "Defend or roll." : "Will you feed your bunny?"}</h2>{isWeapon ? <><p>This weapon succeeds on a d12 roll of <strong>{pending.card.power} or lower</strong>. You have <b>{defenseUnits} Defense units</b>.{player.shields > 0 ? " Your burrow shield will block this attack after the roll." : ""}</p><div className="kb-defense-actions"><button className="kb-primary kb-defense-roll" type="button" disabled={busy} onClick={() => onChoice("roll")}><span>d12</span> Roll the die</button>{gameHasDefense(player) && <button type="button" disabled={busy || defenseUnits < pending.card.power} onClick={() => onChoice("defense")}><Shield size={17} /> Spend {pending.card.power} DEF</button>}</div></> : <><p><strong>{pending.card.name}</strong> requires <b>{cabbageCost} cabbage</b> and <b>{waterCost} water</b>. You currently have {player.cabbage.length} cabbage and {player.water.length} water.</p><div className={`kb-feed-status ${canFeed ? "ready" : "short"}`}><Leaf /> {canFeed ? "You have enough supplies to feed this bunny." : "You do not have enough supplies to feed this bunny."}</div><div className="kb-defense-actions"><button className="kb-primary" type="button" disabled={busy || !canFeed} onClick={() => onChoice("feed")}><Leaf size={17} /> Feed {cabbageCost} + {waterCost}</button><button type="button" disabled={busy} onClick={() => onChoice("decline")}>{player.shields > 0 ? <><Shield size={17} /> Use burrow shield</> : <>Do not feed</>}</button></div></>}</div></section></div>;
}

function gameHasDefense(player) {
  return Array.isArray(player.defenseCards) && player.defenseCards.length > 0;
}

function ExpansionSelector({ game, busy, onAction }) {
  const selected = new Set(game.expansionIds || []);
  const catalog = game.expansionCatalog || [];

  function setExpansions(expansionIds) {
    if (!game.hostControls || busy) return;
    onAction("setExpansions", { expansionIds });
  }

  function toggle(id) {
    setExpansions(selected.has(id)
      ? game.expansionIds.filter((entry) => entry !== id)
      : [...game.expansionIds, id]);
  }

  function selectSeries(series) {
    const seriesIds = catalog.filter((entry) => entry.series === series).map((entry) => entry.id);
    setExpansions([...new Set([...game.expansionIds, ...seriesIds])]);
  }

  return <section className="kb-expansion-picker" aria-labelledby="kb-expansion-title">
    <header><div><span className="kb-kicker"><PackageOpen size={14} /> Optional booster decks</span><h2 id="kb-expansion-title">Build your game set</h2><p>Base Blue + Yellow is always included. Red adds Rooney’s store and Orange adds Weil’s store; each pack shows its official numbered-card count.</p></div><strong>{game.expansionSummary.totalCards}<small>numbered cards</small></strong></header>
    {game.hostControls && <div className="kb-expansion-tools"><button type="button" disabled={busy} onClick={() => setExpansions(catalog.map((entry) => entry.id))}>Select all</button><button type="button" disabled={busy} onClick={() => selectSeries("Series One")}>Series One</button><button type="button" disabled={busy} onClick={() => selectSeries("Conquest")}>Conquest</button><button type="button" disabled={busy} onClick={() => selectSeries("Series Two")}>Series Two</button><button type="button" disabled={busy || !game.expansionIds.length} onClick={() => setExpansions([])}>Clear</button></div>}
    <div className="kb-expansion-series">
      {["Series One", "Conquest", "Series Two"].map((series) => <div key={series}><label>{series}</label><div>{catalog.filter((entry) => entry.series === series).map((entry) => <button key={entry.id} type="button" className={selected.has(entry.id) ? "selected" : ""} disabled={!game.hostControls || busy} onClick={() => toggle(entry.id)} style={{ "--pack-color": entry.color }} aria-pressed={selected.has(entry.id)}><span>{selected.has(entry.id) ? "✓" : entry.order}</span><strong>{entry.name.replace(" Booster", "")}</strong><small>{entry.signature}</small><b>+{entry.cardCounts.total}</b></button>)}</div></div>)}
    </div>
    {!game.hostControls && <p className="kb-expansion-wait">The room host is choosing the expansion set.</p>}
  </section>;
}

function Pile({ title, count, icon, tone, status, busy, onClick }) {
  return <button className={`kb-pile pile-${tone} ${status.enabled ? "enabled" : ""}`} type="button" disabled={!status.enabled || busy} onClick={onClick} title={status.reason}><span className="kb-stack" style={{ "--cards": Math.min(count, 5) }}>{icon}<b>{count}</b></span><strong>{title}</strong><small>{status.reason}</small></button>;
}

function KaballasMarketCard({ market }) {
  return <article className={`kb-market-card ${market.isOpen ? "open" : "closed"}`} aria-label={`Kaballa’s Market is ${market.isOpen ? "open" : "closed"}`}>
    <span className="kb-market-card-type">STARTER CARD</span>
    <div className="kb-market-card-title"><Store /><span><strong>Kaballa’s</strong><b>MARKET</b></span></div>
    <div className="kb-market-sign">{market.isOpen ? "OPEN" : "CLOSED"}</div>
    <p>{market.isOpen ? "Current prices for supplies" : "No purchases until a market card reopens the store"}</p>
    <div className="kb-price-board">
      <span><Leaf /><b>Cabbage</b><strong>{market.prices.cabbage}</strong></span>
      <span><Droplets /><b>Water</b><strong>{market.prices.water}</strong></span>
      <span><Carrot /><b>Carrot</b><strong>{market.prices.carrot}</strong></span>
    </div>
    <small>{market.activeCard ? `Set by “${market.activeCard.name}”` : "Starter prices"}</small>
  </article>;
}

function RooneysEmporium({ store, game, playerIndex, busy, onBuy }) {
  const defenseStatus = getKillerBunniesShopItemStatus(game, playerIndex, "rooneys", "defense");
  return <article className={`kb-specialty-shop kb-rooneys ${store.isOpen ? "open" : "closed"}`} aria-label={`Rooney’s Weapons Emporium is ${store.isOpen ? "open" : "closed"}`}><header><span><Target /></span><div><small>RED BOOSTER STORE</small><strong>Rooney’s Weapons Emporium</strong></div><b>{store.isOpen ? "OPEN" : "CLOSED"}</b></header><p>{store.isOpen ? "Current prices—click an available item to buy it." : "Purchases are unavailable until a card reopens the emporium."}</p><div className="kb-specialty-price-board"><span><Shield /><b>Defense Card</b><strong>{store.defensePrice}<Coins /></strong></span><span><Target /><b>Used Weapon</b><strong>LEVEL<small>Dolla</small></strong></span></div><div className="kb-shop-inventory"><button className="kb-defense-stack" type="button" disabled={busy || !defenseStatus.enabled} onClick={() => onBuy("defense")} title={defenseStatus.reason}><Shield /><strong>{store.defenseSupply.length}</strong><span>{store.defensePrice}<Coins /></span><small>DEFENSE</small></button><div className="kb-used-cards">{store.weaponDiscard.map((card) => { const status = getKillerBunniesShopItemStatus(game, playerIndex, "rooneys", "weapon", card.id); return <button key={card.id} type="button" disabled={busy || !status.enabled} onClick={() => onBuy("weapon", card.id)} title={status.reason}><GameCard card={card} compact /><i>{status.price}<Coins /></i></button>; })}{!store.weaponDiscard.length && <span>No used weapons yet</span>}</div></div><footer>{store.activeCard ? `Current setting: ${store.activeCard.name}. ` : "Starter prices. "}Purchased weapons must go through BOTTOM → TOP RUN.</footer></article>;
}

function WeilsPawnShop({ store, game, playerIndex, busy, onBuy }) {
  return <article className={`kb-specialty-shop kb-weils ${store.isOpen ? "open" : "closed"}`} aria-label={`Weil’s Pawn Shop is ${store.isOpen ? "open" : "closed"}`}><header><span><Rabbit /></span><div><small>ORANGE BOOSTER STORE</small><strong>Weil’s Pawn Shop</strong></div><b>{store.isOpen ? "OPEN" : "CLOSED"}</b></header><p>{store.isOpen ? "Current prices—click an available item to buy it." : "Purchases are unavailable until a card reopens the pawn shop."}</p><div className="kb-specialty-price-board"><span><Rabbit /><b>Colored Pawn</b><strong>{store.pawnPrice}<Coins /></strong></span><span><Rabbit /><b>Discarded Bunny</b><strong>{store.bunnyPrice}<Coins /></strong></span></div><div className="kb-shop-inventory"><div className="kb-pawn-stock">{store.pawnSupply.map((pawn) => { const status = getKillerBunniesShopItemStatus(game, playerIndex, "weils", "pawn", pawn.id); return <button key={pawn.id} className={`pawn-${pawn.color}`} type="button" disabled={busy || !status.enabled} onClick={() => onBuy("pawn", pawn.id)} title={status.reason}><Rabbit /><b>{pawn.color}</b><span>{status.price}<Coins /></span></button>; })}{!store.pawnSupply.length && <span>All pawns owned</span>}</div><div className="kb-used-cards">{store.bunnyDiscard.map((card) => { const status = getKillerBunniesShopItemStatus(game, playerIndex, "weils", "bunny", card.id); return <button key={card.id} type="button" disabled={busy || !status.enabled} onClick={() => onBuy("bunny", card.id)} title={status.reason}><GameCard card={card} compact /><i>{status.price}<Coins /></i></button>; })}{!store.bunnyDiscard.length && <span>No discarded bunnies yet</span>}</div></div><footer>{store.activeCard ? `Current setting: ${store.activeCard.name}. ` : "Starter prices. "}Purchased bunnies must go through BOTTOM → TOP RUN.</footer></article>;
}

function MiniBunny({ bunny }) {
  return <span className={`kb-mini-bunny bunny-${bunny.color || "neutral"}`} title={bunny.name}><Rabbit /><small>{bunny.name?.replace(" Bunny", "")}</small></span>;
}

function GameCard({ card, compact = false, className = "" }) {
  if (card.hidden) return <div className={`kb-playing-card hidden ${compact ? "compact" : ""} ${className}`}><Rabbit /><b>HIDDEN RUN</b></div>;
  const icon = { bunny: <Rabbit />, weapon: <Target />, chooseCarrot: <Carrot />, feed: <Leaf />, defense: <Shield />, money: <Coins />, special: <Sparkles />, verySpecial: <Sparkles />, market: <Store />, shopMarket: <Store /> }[card.kind] || <Rabbit />;
  return <div className={`kb-playing-card kind-${card.kind} color-${card.color || "cream"} ${compact ? "compact" : ""} ${className}`}><span className="kb-card-type">{card.type}{card.catalogNumber ? ` · #${card.catalogNumber}` : ""}</span><div className="kb-card-icon">{icon}</div><strong>{card.name}</strong>{!compact && <p>{card.detail}</p>}{card.power && <b className="kb-card-stat">≤ {card.power}</b>}</div>;
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return <div className="kb-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="kb-rules" role="dialog" aria-modal="true" aria-labelledby="kb-rules-title"><button className="kb-modal-close" type="button" onClick={onClose} aria-label="Close rules"><X /></button><span className="kb-kicker"><BookOpen size={15} /> Digital edition rules</span><h2 id="kb-rules-title">Plan two cards ahead.</h2><div className="kb-rule-steps"><article><b>1</b><div><strong>Program your opening</strong><p>Each player starts with seven playable cards. Pick the TOP RUN card that plays first, then the BOTTOM RUN card that follows it. The hunt begins after everyone confirms both choices.</p></div></article><article><b>2</b><div><strong>Shop and feed</strong><p>Kaballa’s sells food and carrots. A Feed the Bunny card stays on its target until the end of that bunny owner’s turn, so they may buy missing Cabbage and Water before flipping TOP RUN.</p></div></article><article><b>3</b><div><strong>Save special cards</strong><p>A SPECIAL or VERY SPECIAL may be saved only after it completes the BOTTOM RUN → TOP RUN cycle. Saved cards stay face-up and may be played later without replacing the normal TOP RUN play.</p></div></article><article><b>4</b><div><strong>Find the Magic Carrot</strong><p>When every market carrot is gone, click the hidden Magic Carrot pile. You must still have a living bunny and own the matching carrot to win.</p></div></article></div><div className="kb-pile-guide"><span><Layers3 /> Main: after TOP RUN</span><span><Leaf /> Cabbage: current market price</span><span><Droplets /> Water: current market price</span><span><Carrot /> Carrots: current market price</span><span><Sparkles /> Magic: at game end</span></div><p className="kb-disclaimer">Choose A Carrot effects may take a carrot even while the market is closed. Booster names follow the official Quest order; their digital card text and artwork are original to this prototype.</p></section></div>;
}
