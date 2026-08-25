"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen, Bot, Carrot, Coins, Copy, Dices, DoorOpen, Droplets, Layers3, Library,
  Leaf, PackageOpen, Play, Plus, Rabbit, Shield, Sparkles, Store, Target, Users, X,
} from "lucide-react";
import { bankTotal, getKaballasMarket, getKillerBunniesKaballasPrice, getKillerBunniesCardPlayStatus, getKillerBunniesCloverCards, getKillerBunniesCloverReduction, getKillerBunniesDefenseUnits, getKillerBunniesExtraRunStatus, getKillerBunniesFeedingStatus, getKillerBunniesPileStatus, getKillerBunniesSavedSpecialStatus, getKillerBunniesShopItemStatus, getKillerBunniesSupplyUnits } from "../lib/killer-bunnies";
import { KILLER_BUNNIES_EXPANSIONS } from "../lib/killer-bunnies-expansions";
import { KillerBunniesRoomService } from "./killer-bunnies-room-service";

const NAME_KEY = "killer-bunnies-player-name";
const TOKEN_PREFIX = "killer-bunnies-room-token:";
const EXPANDED_CARD_ACTION_PHASES = new Set([
  "rockBottomChoice", "russianRouletteChoose", "russianRouletteRoll", "russianRouletteReroll",
  "freshnessTarget", "freshnessChoice", "weaponExchange", "feedAllTarget", "minilithActivate",
  "minilithPenalty", "barrierPlace", "barrierRemove", "carrotExchange", "clumsyCongenialTarget",
  "redLightDistrict", "hempRoll", "rainboRoll", "rooneysCoupon", "resourceAttackResponse",
  "reversalTarget", "showBunnyTarget", "showBunnyExchange", "dudePlayerChoice", "dudeGuess",
  "dudePenalty", "mysteryUrnRoll", "mysteryUrnDonate", "mysteryUrnFinal", "bountyTarget",
  "bountyAmount", "zepTepiChoice", "sinisterBounceTarget", "timidRerollChoice",
  "lowJackRoll", "bunnyHop", "coolChange", "laHotPeppers", "paintballTarget",
  "runAmokTarget", "runTransformer", "pilferPawnRoll", "freePawnChoice", "randomFeedRoll",
  "royaleGamble",
  "f18Crew",
  "dayDeadRoll", "dayDeadRevive", "fingercuffs", "precessionBirth", "laTapeWorm",
  "zodiacResetRun", "leifTarget", "leifRoll", "leifPassenger", "spoilsportTarget", "albinoTarget", "zodiacPrivilege",
]);

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
  const extraRunStatus = getKillerBunniesExtraRunStatus(viewer);
  const isSecondRun = yourTurn && (game.runPlaysThisTurn || 0) === 1;
  const isOpeningTurn = yourTurn && game.phase === "setupRun";
  const isTrimTurn = yourTurn && game.phase === "trimHand";
  // The server only returns to `play` after the replacement draw when the
  // player's two-RUN qualification has survived its authoritative recheck.
  const canPlayTop = yourTurn && game.phase === "play";
  const isTargeting = yourTurn && game.phase === "target" && !game.pendingAction?.allowOwnTarget;
  const canChooseCarrot = yourTurn && game.phase === "chooseCarrot";
  const savedSpecials = viewer.savedSpecials || [];
  const mustDefend = game.phase === "defend" && game.pendingAction?.playerIndex === viewerIndex;
  const mustResolveImmediate = ["immediateResolve", "immediateTarget"].includes(game.phase) && game.pendingAction?.playerIndex === viewerIndex;
  const mustPlaceModifier = game.phase === "modifierTarget" && game.pendingAction?.playerIndex === viewerIndex;
  const defectorPhase = ["defectorTarget", "defectorRoll", "defectorReroll"].includes(game.phase);
  const mustResolveDefector = defectorPhase && game.pendingAction?.playerIndex === viewerIndex;
  const povertyPokerPhase = ["povertyPokerCall", "povertyPokerAnte", "povertyPokerRoll", "povertyPokerReroll"].includes(game.phase);
  const mustResolvePovertyPoker = povertyPokerPhase && game.pendingAction?.playerIndex === viewerIndex;
  const areaWeaponPhase = game.phase === "areaWeaponRoll";
  const mustResolveAreaWeapon = areaWeaponPhase && game.pendingAction?.playerIndex === viewerIndex;
  const mustChoosePlayerTarget = game.phase === "playerTarget" && game.pendingAction?.playerIndex === viewerIndex;
  const mustChooseUtilityBunny = game.phase === "utilityBunnyTarget" && game.pendingAction?.playerIndex === viewerIndex;
  const mustChooseOwnWeaponTarget = game.phase === "target" && game.pendingAction?.allowOwnTarget && game.pendingAction?.playerIndex === viewerIndex;
  const mustChooseBlueRollTarget = game.phase === "blueRollTarget" && game.pendingAction?.playerIndex === viewerIndex;
  const blueCardRollPhase = game.phase === "blueCardRoll";
  const mustResolveBlueCardRoll = blueCardRollPhase && game.pendingAction?.playerIndex === viewerIndex;
  const numberChoicePhase = game.phase === "numberChoice";
  const blueSpecialRollPhase = game.phase === "blueSpecialRoll";
  const reviveBunnyPhase = game.phase === "reviveBunny";
  const mustResolveBlueSpecial = ["numberChoice", "blueSpecialRoll", "reviveBunny"].includes(game.phase) && game.pendingAction?.playerIndex === viewerIndex;
  const mustChooseRoamingTarget = game.phase === "roamingTarget" && game.pendingAction?.playerIndex === viewerIndex;
  const roamingRollPhase = game.phase === "roamingRoll";
  const mustResolveRoamingRoll = roamingRollPhase && game.pendingAction?.playerIndex === viewerIndex;
  const cardDicePhase = game.phase === "cardDiceRoll";
  const mustResolveCardDice = cardDicePhase && game.pendingAction?.playerIndex === viewerIndex;
  const auctionPhase = ["auctionTarget", "auctionBid"].includes(game.phase);
  const mustResolveAuction = auctionPhase && game.pendingAction?.playerIndex === viewerIndex;
  const bunnyExchangePhase = ["bunnyExchangeGive", "bunnyExchangeTake"].includes(game.phase);
  const mustResolveBunnyExchange = bunnyExchangePhase && game.pendingAction?.playerIndex === viewerIndex;
  const everyoneFeedPhase = game.phase === "everyoneFeedTarget";
  const mustChooseEveryoneFeedBunny = everyoneFeedPhase && game.pendingAction?.playerIndex === viewerIndex;
  const blackCatPhase = ["blackCatTarget", "blackCatRoll", "blackCatRelocate"].includes(game.phase);
  const mustResolveBlackCat = blackCatPhase && game.pendingAction?.playerIndex === viewerIndex;
  const openingTopCard = viewer.hand.find((card) => card.id === openingTopId);
  const openingBottomCard = viewer.hand.find((card) => card.id === openingBottomId);
  const topRunStatus = getKillerBunniesCardPlayStatus(viewer, viewer.topRun);
  const topRunWillDiscard = canPlayTop && viewer.topRun && !topRunStatus.enabled;
  const market = getKaballasMarket(game);
  const marketPrices = Object.fromEntries(["cabbage", "water", "carrot"].map((item) => [item, getKillerBunniesKaballasPrice(game, viewerIndex, item)]));
  const couponActive = Object.keys(marketPrices).some((item) => marketPrices[item] !== market.prices[item]);
  const playableReaction = savedSpecials.find((card) => game.phase !== "play" && getKillerBunniesSavedSpecialStatus(game, viewerIndex, card).enabled);
  const expandedCardAction = EXPANDED_CARD_ACTION_PHASES.has(game.phase);
  const supplyStatuses = {
    main: getKillerBunniesPileStatus(game, viewerIndex, "main"),
    cabbage: getKillerBunniesPileStatus(game, viewerIndex, "cabbage"),
    water: getKillerBunniesPileStatus(game, viewerIndex, "water"),
    carrot: getKillerBunniesPileStatus(game, viewerIndex, "carrot"),
    magic: getKillerBunniesPileStatus(game, viewerIndex, "magic"),
  };
  const opponents = game.players.map((player, index) => ({ player, index })).filter(({ index }) => index !== viewerIndex);
  const bountyTargets = game.players.flatMap((player) => player.bunnies.filter((bunny) => bunny.bounty).map((bunny) => ({ bunny, player })));

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

      {!!bountyTargets.length && <BountyDonationTray targets={bountyTargets} balance={bankTotal(viewer)} canDonate={game.phase === "play"} busy={busy} onDonate={(bunnyId, amount) => onAction("donateBounty", { bunnyId, amount })} />}

      {game.area51Abducted && <section className="kb-active-expansions" aria-label="Area 51 abducted bunny"><span><Sparkles size={13} /> AREA 51</span><i>{game.players[game.area51Abducted.ownerIndex]?.name}'s {(game.area51Abducted.bunnies || [game.area51Abducted.bunny]).filter(Boolean).map((bunny) => bunny.name).join(" and ")} {game.area51Abducted.bunnies?.length > 1 ? "are" : "is"} alive but out of play</i></section>}

      {!!game.barriers?.length && <section className="kb-active-expansions" aria-label="Barriers in play"><span><Shield size={13} /> BARRIERS</span>{game.barriers.map((barrier) => <i key={barrier.id}>{game.players[barrier.leftPlayerIndex]?.name} ↔ {game.players[barrier.rightPlayerIndex]?.name}</i>)}</section>}

      {!!game.futureBunnies?.length && <section className="kb-active-expansions" aria-label="Bunnies in the future"><span><Sparkles size={13} /> FUTURE</span>{game.futureBunnies.map((entry) => <i key={entry.id}>{entry.bunny.name} returns to {game.players[entry.ownerIndex]?.name} on owner turn {entry.returnAtTurnStarted}</i>)}</section>}

      <section className="kb-score-rail" aria-label="Players">
        {game.players.map((player, index) => (
          <div key={player.playerId} className={`kb-score ${game.currentPlayerIndex === index ? "active" : ""} ${player.isViewer ? "viewer" : ""}`}>
            <span className={`kb-avatar avatar-${index % 6}`}>{player.isComputer ? <Bot size={16} /> : player.name[0].toUpperCase()}</span>
            <span><strong>{player.name}</strong><small>{player.bunnies.length} bunnies · {player.carrots.length} carrots{getKillerBunniesExtraRunStatus(player).enabled ? " · 2 RUNS" : ""}</small></span>
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
          <div className={`kb-turn-message phase-${game.phase}`}><span>{game.phase === "setupRun" ? isOpeningTurn ? "PROGRAM YOUR RUN" : "OPENING SETUP" : mustDefend || mustResolveImmediate || mustPlaceModifier || mustResolveDefector || mustResolvePovertyPoker || mustResolveAreaWeapon || mustChoosePlayerTarget || mustChooseUtilityBunny || mustChooseOwnWeaponTarget || mustChooseBlueRollTarget || mustResolveBlueCardRoll || mustResolveBlueSpecial || mustChooseRoamingTarget || mustResolveRoamingRoll || mustResolveCardDice || mustResolveAuction || mustResolveBunnyExchange || mustChooseEveryoneFeedBunny || mustResolveBlackCat ? "ACTION NEEDED" : yourTurn ? "YOUR TURN" : `${game.players[game.currentPlayerIndex]?.name?.toUpperCase() || "GAME"}`}</span><p>{game.message}</p>{game.lastRoll && <LastRollBadge roll={game.lastRoll} />}</div>

          {!!game.roamingEffects?.length && <div className="kb-active-expansions" aria-label="Roaming attacks">{game.roamingEffects.map((effect) => <i key={effect.id}><Target size={12} /> {effect.card.name} waits on {game.players.flatMap((player) => player.bunnies).find((bunny) => bunny.id === effect.currentBunnyId)?.name || "the next target"}</i>)}</div>}

          <div className="kb-pile-row">
            <Pile title="Main draw" count={game.mainDeck.length} icon={<Layers3 />} tone="main" status={supplyStatuses.main} busy={busy} onClick={() => onAction("drawPile", { pile: "main" })} />
            <Pile title="Cabbage" count={game.cabbageSupply.length} icon={<Leaf />} tone="cabbage" status={supplyStatuses.cabbage} busy={busy} onClick={() => onAction("drawPile", { pile: "cabbage" })} />
            <Pile title="Water" count={game.waterSupply.length} icon={<Droplets />} tone="water" status={supplyStatuses.water} busy={busy} onClick={() => onAction("drawPile", { pile: "water" })} />
            <Pile title="Magic Carrot" count={game.magicCarrotDeck.length} icon={<Sparkles />} tone="magic" status={supplyStatuses.magic} busy={busy} onClick={() => onAction("drawPile", { pile: "magic" })} />
            <Pile title="Discard" count={game.discardPile.length} icon={<Layers3 />} tone="discard" status={{ enabled: false, reason: "Played cards rest here." }} busy />
          </div>

          <div className={`kb-market ${market.isOpen ? "open" : "closed"}`}>
            <KaballasMarketCard market={market} prices={marketPrices} couponActive={couponActive} />
            <div className="kb-market-stock">
              <div className="kb-market-label"><span><Carrot size={17} /> Carrots for sale</span><small>{canChooseCarrot ? "Choose A Carrot works even while closed" : supplyStatuses.carrot.reason}</small></div>
              <div className="kb-carrot-row">
                {game.carrotMarket.map((carrotCard) => <button key={carrotCard.id} type="button" className={`kb-carrot-card carrot-${carrotCard.color}`} disabled={busy || (!canChooseCarrot && !supplyStatuses.carrot.enabled)} onClick={() => clickCarrot(carrotCard)}><Carrot /><b>{carrotCard.label}</b><span>{canChooseCarrot ? "TAKE" : marketPrices.carrot}<Coins size={10} /></span></button>)}
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
          <div className="kb-resource-chips"><span><Coins /> {bankTotal(viewer)}</span><span><Leaf /> {getKillerBunniesSupplyUnits(viewer, "cabbage")}</span><span><Droplets /> {getKillerBunniesSupplyUnits(viewer, "water")}</span><span><Shield /> {viewer.shields}</span>{game.rooneysEmporium && <span><Shield /> {getKillerBunniesDefenseUnits(viewer)} DEF</span>}{game.weilsPawnShop && <span><Rabbit /> {viewer.pawns?.length || 0} pawns</span>}<span><Carrot /> {viewer.carrots.length}</span>{game.expansionIds?.includes("green") && <span><Sparkles /> {viewer.zodiacCards?.length || 0} Zodiac</span>}<span><Sparkles /> {savedSpecials.length}</span></div>
        </div>

        <FeedingObligations player={viewer} yourTurn={yourTurn} phase={game.phase} />

        {viewer.insightCarrots?.length > 0 && <section className="kb-extra-run-status qualified"><span><Sparkles /> PRIVATE INSIGHT</span><strong>Top Magic Carrots: {viewer.insightCarrots.map((card) => card.name.replace(/^Hidden\s+/i, "")).join(" · ")}</strong><small>Only you can see this preview; the deck order has not changed.</small></section>}

        {(extraRunStatus.enabled || isSecondRun) && <section className={`kb-extra-run-status ${extraRunStatus.enabled ? "qualified" : "lost"}`}><span><Rabbit /> {extraRunStatus.enabled ? "TWO RUNS ACTIVE" : "SECOND RUN LOST"}</span><strong>{isSecondRun && extraRunStatus.enabled ? "Second TOP RUN ready" : extraRunStatus.reason}</strong><small>{isSecondRun ? "The qualification was checked again after drawing and replacing BOTTOM RUN." : "After the first RUN, draw and replace BOTTOM RUN before playing the second."}</small></section>}

        {!!viewer.zodiacCards?.length && <section className="kb-extra-run-status qualified"><span><Sparkles /> SAVED ZODIAC</span><strong>{viewer.zodiacCards.map((card) => card.sign || card.name).join(" · ")}</strong><small>Three consecutive signs or all three signs of one element unlock two RUN plays.</small></section>}
        {game.winningZodiac && <section className="kb-extra-run-status qualified"><span><Sparkles /> WINNING ZODIAC</span><strong>{game.winningZodiac.sign || game.winningZodiac.name}</strong><small>Revealed before the Magic Carrot.</small></section>}

        {game.phase === "setupRun" && <div className={`kb-opening-setup ${isOpeningTurn ? "active" : "waiting"}`}><div><span className="kb-kicker"><Layers3 size={14} /> Opening program</span><strong>{isOpeningTurn ? "Pick your first two RUN cards" : `Waiting for ${game.players[game.currentPlayerIndex]?.name}`}</strong><p>{isOpeningTurn ? "Select TOP RUN first—the card that will play on your first turn—then select BOTTOM RUN for the following turn." : "You may review your hand while the current player finishes programming their RUN."}</p></div>{isOpeningTurn && <button className="kb-primary" type="button" disabled={busy || !openingTopId || !openingBottomId} onClick={() => onAction("chooseInitialRun", { topCardId: openingTopId, bottomCardId: openingBottomId })}><Play size={17} /> Confirm opening RUN</button>}</div>}

        <div className="kb-mat-grid">
          <div className="kb-bunny-circle"><label>BUNNY CIRCLE</label><div>{viewer.bunnies.map((bunny) => <MiniBunny key={bunny.id} bunny={bunny} />)}{!viewer.bunnies.length && <span className="kb-empty-slot"><Rabbit /> No living bunnies</span>}</div></div>
          <div className="kb-run-lane"><label>PROGRAMMED RUN</label><div className="kb-run-slots"><button className={`kb-run-card top ${canPlayTop ? "ready" : ""} ${topRunWillDiscard ? "needs-bunny" : ""} ${openingTopCard ? "opening-picked" : ""}`} type="button" disabled={!canPlayTop || busy || !viewer.topRun} onClick={() => onAction("playTopRun")} title={topRunWillDiscard ? `${topRunStatus.reason} Click to discard it.` : isSecondRun ? "Play your second TOP RUN card." : "Play your TOP RUN card."}><span>{game.phase === "setupRun" ? "TOP RUN · PLAYS FIRST" : topRunWillDiscard ? "TOP RUN · DISCARD — NEED BUNNY" : isSecondRun ? "TOP RUN · SECOND PLAY" : "TOP RUN · PLAY NOW"}</span>{openingTopCard ? <GameCard card={openingTopCard} compact /> : viewer.topRun ? <GameCard card={viewer.topRun} compact /> : <i>{isOpeningTurn ? "Choose first from hand" : "Not programmed"}</i>}{topRunWillDiscard && <i className="kb-bunny-required"><Rabbit /> Requires a living bunny</i>}</button><div className="kb-run-arrow">→</div><div className={`kb-run-card bottom ${openingBottomCard ? "opening-picked" : ""}`}><span>{game.phase === "setupRun" ? "BOTTOM RUN · PLAYS SECOND" : "BOTTOM RUN · NEXT"}</span>{openingBottomCard ? <GameCard card={openingBottomCard} compact /> : viewer.bottomRun ? <GameCard card={viewer.bottomRun} compact /> : <i className={(game.phase === "replace" && yourTurn) || (isOpeningTurn && openingTopId) ? "pulse" : ""}>{isOpeningTurn && openingTopId ? "Choose second from hand" : "Choose from hand"}</i>}</div></div></div>
          <div className="kb-collected"><label>YOUR CARROTS</label><div>{viewer.carrots.map((card) => <span key={card.id} className={`carrot-${card.color}`}><Carrot />{card.label}</span>)}{!viewer.carrots.length && <small>None yet</small>}</div></div>
        </div>

        <div className="kb-saved-area">
          <div className="kb-hand-heading"><span>SAVED SPECIALS · {savedSpecials.length} CARDS</span><b>Saved cards do not replace your normal TOP RUN play</b></div>
          <div className="kb-saved-cards">
            {savedSpecials.map((card) => {
              const status = getKillerBunniesSavedSpecialStatus(game, viewerIndex, card);
              return <button key={card.id} type="button" disabled={busy || !status.enabled} onClick={() => onAction("playSaved", { cardId: card.id })} title={status.reason}><GameCard card={card} compact /></button>;
            })}
            {!savedSpecials.length && <span><Sparkles /> Run a SPECIAL or VERY SPECIAL card through BOTTOM and TOP RUN to save it here.</span>}
          </div>
        </div>

        <div className="kb-hand-area"><div className="kb-hand-heading"><span>YOUR HAND · {viewer.hand.length} CARDS</span>{isTrimTurn ? <b>Discard {viewer.hand.length - 5} extra card{viewer.hand.length - 5 === 1 ? "" : "s"}</b> : game.phase === "replace" && yourTurn ? <b>Choose one for BOTTOM RUN</b> : isOpeningTurn ? <b>{!openingTopId ? "Choose TOP RUN first" : !openingBottomId ? "Now choose BOTTOM RUN" : "Review and confirm your program"}</b> : null}</div><div className="kb-hand">{viewer.hand.map((card) => { const openingSlot = openingTopId === card.id ? "TOP · 1" : openingBottomId === card.id ? "BOTTOM · 2" : ""; return <button key={card.id} className={`${openingSlot ? "opening-selected" : ""} ${isTrimTurn ? "trim-choice" : ""}`} type="button" disabled={busy || (!isOpeningTurn && !isTrimTurn && (game.phase !== "replace" || !yourTurn))} onClick={() => isOpeningTurn ? selectOpeningRunCard(card.id) : isTrimTurn ? onAction("discardExtra", { cardId: card.id }) : onAction("replaceRun", { cardId: card.id })}>{openingSlot && <i className="kb-opening-badge">{openingSlot}</i>}<GameCard card={card} /></button>; })}</div></div>
      </section>

      {error && <div className="kb-toast" role="alert">{error}</div>}
      {playableReaction && <aside className="kb-reaction-card" aria-label="Available reaction"><GameCard card={playableReaction} compact /><div><b>Interrupt available</b><span>{getKillerBunniesSavedSpecialStatus(game, viewerIndex, playableReaction).reason}</span><button className="kb-primary" type="button" disabled={busy} onClick={() => onAction("playSaved", { cardId: playableReaction.id })}><Sparkles size={16} /> Use {playableReaction.name}</button></div></aside>}
      {game.phase === "specialChoice" && game.pendingAction?.playerIndex === viewerIndex && <SpecialChoiceDialog card={game.pendingAction.card} busy={busy} onChoice={(choice) => onAction("specialChoice", { choice })} />}
      {mustDefend && <DefenseDialog pending={game.pendingAction} player={viewer} busy={busy} onChoice={(choice) => onAction("resolveDefense", { choice })} />}
      {game.phase === "weaponReuseChoice" && <WeaponReuseDialog pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onChoice={(choice) => onAction("resolveWeaponReuse", { choice })} />}
      {mustResolveCardDice && <CardDiceDialog pending={game.pendingAction} busy={busy} onRoll={(choiceId) => onAction("resolveCardDiceRoll", { choiceId })} />}
      {auctionPhase && <BunnyAuctionDialog phase={game.phase} pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseAuctionTarget", { targetPlayerIndex, bunnyId })} onBid={(amount) => onAction("placeAuctionBid", { amount })} />}
      {bunnyExchangePhase && <BunnyExchangeDialog phase={game.phase} pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onGive={(bunnyId) => onAction("chooseBunnyExchangeGive", { bunnyId })} onExchange={(targetPlayerIndex, bunnyIds) => onAction("resolveBunnyExchange", { targetPlayerIndex, bunnyIds })} />}
      {everyoneFeedPhase && <EveryoneFeedDialog pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onChoose={(bunnyId) => onAction("chooseEveryoneFeedBunny", { bunnyId })} />}
      {blackCatPhase && <BlackCatDialog phase={game.phase} pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseBlackCatTarget", { targetPlayerIndex, bunnyId })} onRoll={() => onAction("resolveBlackCatRoll")} onPlace={(targetPlayerIndex, bunnyId) => onAction("placeBlackCatClover", { targetPlayerIndex, bunnyId })} onDiscard={() => onAction("discardBlackCatClover")} />}
      {game.phase === "manualResolve" && game.pendingAction?.playerIndex === viewerIndex && <ManualResolutionDialog pending={game.pendingAction} busy={busy} onRoll={(choiceId) => onAction("resolveCardDiceRoll", { choiceId })} onConfirm={() => onAction("resolveManualCard")} />}
      {mustResolveImmediate && <ImmediateCardDialog pending={game.pendingAction} player={viewer} players={game.players} viewerIndex={viewerIndex} busy={busy} onConfirm={() => onAction("resolveImmediateCard")} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseMisfortuneTarget", { targetPlayerIndex, bunnyId })} />}
      {mustPlaceModifier && <ModifierTargetDialog pending={game.pendingAction} players={game.players} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseModifierTarget", { targetPlayerIndex, bunnyId })} />}
      {defectorPhase && <DefectorDetectorDialog phase={game.phase} pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseDefectorTarget", { targetPlayerIndex, bunnyId })} onDiscard={() => onAction("discardDefectorDetector")} onRoll={(choice) => onAction("resolveDefectorRoll", { choice })} />}
      {povertyPokerPhase && <PovertyPokerDialog phase={game.phase} pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onCall={(stakes) => onAction("callPovertyPoker", { stakes })} onAnte={(selections) => onAction("antePovertyPoker", { selections })} onRoll={(choice) => onAction("resolvePovertyPokerRoll", { choice })} />}
      {areaWeaponPhase && <AreaWeaponDialog pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onRoll={() => onAction("resolveAreaWeaponRoll")} />}
      {mustChoosePlayerTarget && <PlayerTargetDialog pending={game.pendingAction} players={game.players} busy={busy} onTarget={(targetPlayerIndex) => onAction("choosePlayerTarget", { targetPlayerIndex })} />}
      {mustChooseUtilityBunny && <UtilityBunnyTargetDialog pending={game.pendingAction} players={game.players} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseUtilityBunnyTarget", { targetPlayerIndex, bunnyId })} />}
      {mustChooseOwnWeaponTarget && <UtilityBunnyTargetDialog pending={game.pendingAction} players={[viewer]} busy={busy} onTarget={(_, bunnyId) => onAction("targetBunny", { targetPlayerIndex: viewerIndex, bunnyId })} />}
      {mustChooseBlueRollTarget && <UtilityBunnyTargetDialog pending={game.pendingAction} players={game.players} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseBlueRollTarget", { targetPlayerIndex, bunnyId })} />}
      {blueCardRollPhase && <BlueCardRollDialog pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onRoll={() => onAction("resolveBlueCardRoll")} />}
      {numberChoicePhase && <NumberChoiceDialog pending={game.pendingAction} viewerIndex={viewerIndex} busy={busy} onChoose={(value) => onAction("chooseNumber", { value })} />}
      {blueSpecialRollPhase && <BlueCardRollDialog pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onRoll={() => onAction("resolveBlueSpecialRoll")} />}
      {reviveBunnyPhase && <ReviveBunnyDialog pending={game.pendingAction} game={game} viewerIndex={viewerIndex} busy={busy} onChoose={(bunnyId) => onAction("chooseRevivedBunny", { bunnyId })} />}
      {mustChooseRoamingTarget && <UtilityBunnyTargetDialog pending={game.pendingAction} players={game.players} busy={busy} onTarget={(targetPlayerIndex, bunnyId) => onAction("chooseRoamingTarget", { targetPlayerIndex, bunnyId })} />}
      {roamingRollPhase && <BlueCardRollDialog pending={game.pendingAction} players={game.players} viewerIndex={viewerIndex} busy={busy} onRoll={() => onAction("resolveRoamingRoll")} />}
      {expandedCardAction && <ExpandedCardActionDialog game={game} viewerIndex={viewerIndex} busy={busy} onResolve={(cardAction) => onAction("resolveCardAction", { cardAction })} />}
      <DiceRollOverlay roll={game.lastRoll} />
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

function BountyDonationTray({ targets, balance, canDonate, busy, onDonate }) {
  const [amount, setAmount] = useState(1);
  return <section className="kb-bounty-tray" aria-label="Active bounties"><span><Target size={14} /> ACTIVE BOUNTIES</span>{targets.map(({ bunny, player }) => <article key={bunny.id}><b>{bunny.name}</b><small>{player.name} · {bunny.bounty.amount} Dolla</small><input aria-label={`Donation for ${bunny.name}`} type="number" min="1" max={balance} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><button type="button" disabled={busy || !canDonate || amount < 1 || amount > balance} onClick={() => onDonate(bunny.id, amount)}>Add Dolla</button></article>)}</section>;
}

function LastRollBadge({ roll }) {
  const dice = normalizeLastRollDice(roll);
  return <div className="kb-last-roll" aria-label={`Last roll: ${dice.map(formatVisibleDie).join(", ")}`}>{dice.map((die, index) => <span data-color={die.color || "neutral"} key={`${die.color || "die"}-${index}`}><small>{die.color ? die.color[0].toUpperCase() : "d"}</small>{die.value}</span>)}</div>;
}

function DiceRollOverlay({ roll }) {
  const rollKey = roll?.id ?? (roll ? JSON.stringify(roll) : null);
  const initialKey = rollKey;
  const seenKey = useRef(initialKey);
  const [displayRoll, setDisplayRoll] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!roll || rollKey === seenKey.current) return undefined;
    seenKey.current = rollKey;
    setDisplayRoll(roll);
    setRevealed(false);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const revealTimer = window.setTimeout(() => setRevealed(true), reducedMotion ? 50 : 850);
    const closeTimer = window.setTimeout(() => setDisplayRoll(null), reducedMotion ? 1800 : 3400);
    return () => { window.clearTimeout(revealTimer); window.clearTimeout(closeTimer); };
  }, [rollKey]);

  if (!displayRoll) return null;
  const dice = normalizeLastRollDice(displayRoll);
  return <div className={`kb-dice-overlay ${revealed ? "revealed" : "rolling"}`} aria-live="assertive" aria-atomic="true"><section><span className="kb-kicker"><Dices size={16} /> {revealed ? "Roll complete" : "Dice rolling"}</span><h2>{displayRoll.rollerName ? `${displayRoll.rollerName} rolls` : "Rolling dice"}</h2><p>{displayRoll.label}</p><div className="kb-dice-stage">{dice.map((die, index) => <article data-color={die.color || "neutral"} key={`${displayRoll.id || "roll"}-${index}`} style={{ "--die-delay": `${index * 70}ms` }}><div className="kb-animated-die"><b>{revealed ? die.value : "?"}</b></div><strong>{die.color ? `${capitalizeDieColor(die.color)} ` : ""}d{die.sides}</strong>{revealed && <small>rolled {die.value}</small>}</article>)}</div></section></div>;
}

function normalizeLastRollDice(roll) {
  if (Array.isArray(roll?.dice) && roll.dice.length) return roll.dice;
  return roll ? [{ value: roll.value, sides: roll.sides, color: roll.color || null }] : [];
}

function capitalizeDieColor(color) {
  return String(color || "").replace(/^./, (letter) => letter.toUpperCase());
}

function formatVisibleDie(die) {
  return `${die.color ? `${capitalizeDieColor(die.color)} ` : ""}d${die.sides} rolled ${die.value}`;
}

function SpecialChoiceDialog({ card, busy, onChoice }) {
  return <div className="kb-modal-backdrop"><section className="kb-special-choice" role="dialog" aria-modal="true" aria-labelledby="kb-special-choice-title"><GameCard card={card} /><div><span className="kb-kicker"><Sparkles size={15} /> TOP RUN special</span><h2 id="kb-special-choice-title">Use it or save it?</h2><p>Because this card completed the BOTTOM RUN → TOP RUN cycle, you may keep it face-up for later instead of resolving it now.</p><div><button className="kb-primary" type="button" disabled={busy} onClick={() => onChoice("save")}><PackageOpen size={17} /> Save for later</button><button type="button" disabled={busy} onClick={() => onChoice("use")}><Play size={17} /> Use now</button></div></div></section></div>;
}

function WeaponReuseDialog({ pending, players, viewerIndex, busy, onChoice }) {
  const controller = players[pending.playerIndex];
  const isController = pending.playerIndex === viewerIndex;
  return <div className="kb-modal-backdrop"><section className="kb-special-choice kb-weapon-reuse" role="dialog" aria-modal="true" aria-labelledby="kb-weapon-reuse-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Target size={15} /> Rooney’s Reusables</span><h2 id="kb-weapon-reuse-title">Launch this Weapon a second time?</h2><p>{controller.name} may spend the saved Rooney’s Reusables now and choose the same or a different opponent’s bunny. Keeping Reusables sends this Weapon to its normal discard location.</p>{isController ? <div><button className="kb-primary" type="button" disabled={busy} onClick={() => onChoice("reuse")}><Target size={17} /> Reuse Weapon</button><button type="button" disabled={busy} onClick={() => onChoice("discard")}><Layers3 size={17} /> Keep Reusables</button></div> : <p>Waiting for {controller.name} to decide.</p>}</div></section></div>;
}

function ExpandedCardActionDialog({ game, viewerIndex, busy, onResolve }) {
  const pending = game.pendingAction || {};
  const controller = game.players[pending.playerIndex];
  const isController = pending.playerIndex === viewerIndex;
  const [choice, setChoice] = useState({});
  const [amount, setAmount] = useState(1);
  useEffect(() => { setChoice({}); setAmount(1); }, [game.phase, pending.card?.id, pending.playerIndex]);
  const viewer = game.players[viewerIndex];
  const allBunnies = game.players.flatMap((player, playerIndex) => player.bunnies.map((bunny) => ({ bunny, player, playerIndex })));
  const toggle = (key, id) => setChoice((current) => ({ ...current, [key]: current[key]?.includes(id) ? current[key].filter((entry) => entry !== id) : [...(current[key] || []), id] }));
  const pick = (key, value) => setChoice((current) => ({ ...current, [key]: value }));
  const submit = (extra = {}) => onResolve({ ...choice, ...extra });
  const rollPhases = ["russianRouletteRoll", "hempRoll", "rainboRoll", "mysteryUrnRoll", "mysteryUrnFinal", "lowJackRoll", "pilferPawnRoll", "randomFeedRoll", "dayDeadRoll", "leifRoll"];

  let controls = null;
  if (isController && rollPhases.includes(game.phase)) controls = <button className="kb-primary" type="button" disabled={busy} onClick={() => submit()}><Dices size={17} /> Roll now</button>;
  else if (isController && game.phase === "rooneysCoupon") controls = <button className="kb-primary" type="button" disabled={busy} onClick={() => submit()}><Store size={17} /> Activate coupon</button>;
  else if (isController && game.phase === "timidRerollChoice") controls = <><button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ choice: "reroll" })}><Dices size={17} /> Reroll</button><button type="button" disabled={busy} onClick={() => submit({ choice: "keep" })}>Keep roll</button></>;
  else if (isController && game.phase === "russianRouletteReroll") controls = <><button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ choice: "reroll" })}><Dices size={17} /> Replace roll</button><button type="button" disabled={busy} onClick={() => submit({ choice: "keep" })}>Keep roll</button></>;
  else if (isController && game.phase === "resourceAttackResponse") controls = <button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ choice: "accept" })}>Accept the loss</button>;
  else if (isController && game.phase === "rockBottomChoice") controls = <><div className="kb-choice-grid">{pending.eligibleResources?.map((resource) => { const maximum = Math.max(...game.players.map((player, index) => index === viewerIndex ? -1 : getKillerBunniesSupplyUnits(player, resource))); const candidates = game.players.map((player, index) => ({ player, index })).filter(({ index, player }) => index !== viewerIndex && getKillerBunniesSupplyUnits(player, resource) === maximum); return <label key={resource}><b>{resource}</b><select value={choice[`${resource}PlayerIndex`] ?? candidates[0]?.index ?? ""} onChange={(event) => pick(`${resource}PlayerIndex`, Number(event.target.value))}>{candidates.map(({ player, index }) => <option key={player.playerId} value={index}>{player.name} ({maximum})</option>)}</select></label>; })}</div><button className="kb-primary" type="button" disabled={busy} onClick={() => submit()}>Take half</button></>;
  else if (isController && game.phase === "russianRouletteChoose") controls = <ChoiceButtons items={viewer.bunnies.filter((bunny) => !/Heavenly Halo/i.test((bunny.modifiers || []).map((card) => card.name).join(" "))).map((bunny) => ({ id: bunny.id, label: bunny.name }))} busy={busy} onPick={(bunnyId) => submit({ bunnyId })} />;
  else if (isController && ["freshnessTarget", "feedAllTarget", "showBunnyTarget"].includes(game.phase)) controls = <ChoiceButtons items={game.players.map((player, index) => ({ id: index, label: player.name, disabled: index === viewerIndex || (game.phase === "freshnessTarget" && !player.carrots.length) || (game.phase === "feedAllTarget" && !player.bunnies.length) }))} busy={busy} onPick={(targetPlayerIndex) => submit({ targetPlayerIndex })} />;
  else if (isController && game.phase === "freshnessChoice") controls = <><MultiChoice items={viewer.carrots} selected={choice.carrotIds || []} onToggle={(id) => toggle("carrotIds", id)} label={(card) => `Carrot ${card.label} · keep for 2 Dolla`} /><button className="kb-primary" type="button" disabled={busy || (choice.carrotIds?.length || 0) * 2 > bankTotal(viewer)} onClick={() => submit({ carrotIds: choice.carrotIds || [] })}>Pay and return the rest</button></>;
  else if (isController && game.phase === "weaponExchange") {
    const ownWeapons = viewer.hand.filter((card) => card.kind === "weapon");
    const otherWeapons = game.players.flatMap((player, targetPlayerIndex) => targetPlayerIndex === viewerIndex ? [] : player.hand.filter((card) => card.kind === "weapon").map((card) => ({ ...card, targetPlayerIndex })));
    const rooneyWeapons = game.rooneysEmporium?.weaponDiscard || [];
    controls = <><MultiChoice items={ownWeapons} selected={choice.ownWeaponId ? [choice.ownWeaponId] : []} onToggle={(id) => pick("ownWeaponId", id)} /><MultiChoice items={[...otherWeapons, ...rooneyWeapons.map((card) => ({ ...card, source: "rooneys" }))]} selected={choice.targetWeaponId ? [choice.targetWeaponId] : []} onToggle={(id) => { const card = [...otherWeapons, ...rooneyWeapons.map((entry) => ({ ...entry, source: "rooneys" }))].find((entry) => entry.id === id); setChoice((current) => ({ ...current, targetWeaponId: id, source: card?.source || "player", targetPlayerIndex: card?.targetPlayerIndex })); }} /><button className="kb-primary" type="button" disabled={busy || !choice.ownWeaponId || !choice.targetWeaponId} onClick={() => submit()}>Exchange Weapons</button></>;
  } else if (isController && game.phase === "minilithActivate") controls = <div className="kb-choice-grid">{game.players.map((player, targetPlayerIndex) => !pending.minilithHolderIndexes?.includes(targetPlayerIndex) ? null : <article key={player.playerId}><b>{player.name}</b><button type="button" disabled={busy} onClick={() => submit({ targetPlayerIndex, mode: "steal" })}>Steal Minilith</button>{player.savedSpecials.some((card) => Number(card.number) === 147) && <button type="button" disabled={busy} onClick={() => submit({ targetPlayerIndex, mode: "roll" })}><Dices size={15} /> Roll seven dice</button>}</article>)}</div>;
  else if (isController && game.phase === "minilithPenalty") controls = <><MultiChoice items={viewer.carrots} selected={choice.carrotIds || []} onToggle={(id) => toggle("carrotIds", id)} label={(card) => `Carrot ${card.label}`} /><MultiChoice items={viewer.bunnies} selected={choice.bunnyIds || []} onToggle={(id) => toggle("bunnyIds", id)} /><button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ carrotIds: choice.carrotIds || [], bunnyIds: choice.bunnyIds || [] })}>Surrender selected items</button></>;
  else if (isController && game.phase === "barrierPlace") controls = <ChoiceButtons items={game.players.map((player, index) => ({ id: index, label: `${player.name} ↔ ${game.players[(index + 1) % game.players.length].name}` }))} busy={busy} onPick={(leftPlayerIndex) => submit({ leftPlayerIndex })} />;
  else if (isController && game.phase === "barrierRemove") controls = <ChoiceButtons items={(game.barriers || []).map((barrier) => ({ id: barrier.id, label: `${game.players[barrier.leftPlayerIndex].name} ↔ ${game.players[barrier.rightPlayerIndex].name}` }))} busy={busy} onPick={(barrierId) => submit({ barrierId })} />;
  else if (isController && game.phase === "bunnyHop") controls = <ChoiceButtons items={game.players.map((player, index) => ({ id: index, label: `${player.name} ↔ ${game.players[(index + 1) % game.players.length].name}` }))} busy={busy} onPick={(leftPlayerIndex) => submit({ leftPlayerIndex })} />;
  else if (isController && game.phase === "coolChange") { const cards = [...viewer.hand, viewer.topRun, viewer.bottomRun].filter(Boolean); controls = <><MultiChoice items={cards} selected={choice.cardIds || []} onToggle={(id) => toggle("cardIds", id)} /><button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ cardIds: choice.cardIds || [] })}>Replace selected cards</button></>; }
  else if (isController && game.phase === "laHotPeppers") controls = <ChoiceButtons items={(pending.obligations || []).map((obligation) => ({ id: obligation.id, label: `${game.players[obligation.targetPlayerIndex]?.name}: ${obligation.card?.name || "Feed the Bunny"} · ${obligation.waterCost} Water` }))} busy={busy} onPick={(obligationId) => submit({ obligationId })} />;
  else if (isController && game.phase === "paintballTarget") { const items = game.players.flatMap((player, targetPlayerIndex) => [...player.bunnies.map((item) => ({ id: item.id, label: `${player.name}: ${item.name}`, targetPlayerIndex, itemType: "bunny" })), ...(player.pawns || []).map((item) => ({ id: item.id, label: `${player.name}: ${item.name}`, targetPlayerIndex, itemType: "pawn" }))]); controls = <ChoiceButtons items={items} busy={busy} onPick={(itemId) => { const item = items.find((entry) => entry.id === itemId); submit({ itemId, targetPlayerIndex: item.targetPlayerIndex, itemType: item.itemType }); }} />; }
  else if (isController && game.phase === "runAmokTarget") controls = <ChoiceButtons items={game.players.map((player, targetPlayerIndex) => ({ id: targetPlayerIndex, label: player.name, disabled: targetPlayerIndex === viewerIndex }))} busy={busy} onPick={(targetPlayerIndex) => submit({ targetPlayerIndex })} />;
  else if (isController && game.phase === "runTransformer") controls = <ChoiceButtons items={viewer.hand.filter((card) => pending.eligibleIds?.includes(card.id)).map((card) => ({ id: card.id, label: card.name }))} busy={busy} onPick={(cardId) => submit({ cardId })} />;
  else if (isController && game.phase === "freePawnChoice") controls = <><MultiChoice items={game.weilsPawnShop?.pawnSupply || []} selected={choice.pawnIds || []} onToggle={(id) => setChoice((current) => { const ids = current.pawnIds || []; return { ...current, pawnIds: ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id].slice(-2) }; })} /><button className="kb-primary" type="button" disabled={busy || !choice.pawnIds?.length} onClick={() => submit({ pawnIds: choice.pawnIds })}>Take selected Pawns</button></>;
  else if (isController && game.phase === "royaleGamble") controls = <><button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ choice: "keep" })}>Keep reward</button><button type="button" disabled={busy} onClick={() => submit({ choice: "gamble" })}><Dices size={17} /> Gamble with Red d12</button></>;
  else if (isController && game.phase === "f18Crew") controls = <><MultiChoice items={viewer.bunnies} selected={choice.bunnyIds || []} onToggle={(id) => setChoice((current) => { const ids = current.bunnyIds || []; return { ...current, bunnyIds: ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id].slice(-2) }; })} /><button className="kb-primary" type="button" disabled={busy || choice.bunnyIds?.length !== 2} onClick={() => submit({ bunnyIds: choice.bunnyIds })}>Launch F-18 crew</button></>;
  else if (isController && game.phase === "dayDeadRevive") { const discarded = [...(game.weilsPawnShop?.bunnyDiscard || []), ...game.discardPile.filter((card) => card.kind === "bunny")].filter((bunny) => pending.eligibleBunnyIds?.includes(bunny.id)); controls = <><MultiChoice items={discarded} selected={choice.bunnyIds || []} onToggle={(id) => setChoice((current) => { const ids = current.bunnyIds || []; return { ...current, bunnyIds: ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id].slice(-(pending.maxRevive || 3)) }; })} /><button className="kb-primary" type="button" disabled={busy || !choice.bunnyIds?.length} onClick={() => submit({ bunnyIds: choice.bunnyIds })}>Revive selected bunnies</button></>; }
  else if (isController && game.phase === "fingercuffs") { const circle = game.bunnyCircle?.map((id) => allBunnies.find(({ bunny }) => bunny.id === id)).filter(Boolean) || allBunnies; const pairs = circle.map((entry, index) => ({ id: `${entry.bunny.id}|${circle[(index + 1) % circle.length].bunny.id}`, label: `${entry.bunny.name} + ${circle[(index + 1) % circle.length].bunny.name}`, bunnyIds: [entry.bunny.id, circle[(index + 1) % circle.length].bunny.id] })); controls = <ChoiceButtons items={pairs} busy={busy} onPick={(id) => submit({ bunnyIds: pairs.find((pair) => pair.id === id).bunnyIds })} />; }
  else if (isController && game.phase === "precessionBirth") controls = <ChoiceButtons items={["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"].map((sign) => ({ id: sign, label: sign }))} busy={busy} onPick={(birthZodiac) => submit({ birthZodiac })} />;
  else if (isController && game.phase === "laTapeWorm") controls = <ChoiceButtons items={(pending.obligations || []).map((obligation) => ({ id: obligation.id, label: `${game.players[obligation.targetPlayerIndex]?.name}: ${obligation.card?.name || "Feed the Bunny"} · ${obligation.cabbageCost} Cabbage` }))} busy={busy} onPick={(obligationId) => submit({ obligationId })} />;
  else if (isController && game.phase === "zodiacResetRun") controls = <><MultiChoice items={viewer.hand} selected={choice.cardIds || []} onToggle={(id) => setChoice((current) => { const ids = current.cardIds || []; return { ...current, cardIds: ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id].slice(-2) }; })} label={(card) => `${(choice.cardIds || []).indexOf(card.id) === 0 ? "TOP" : (choice.cardIds || []).indexOf(card.id) === 1 ? "BOTTOM" : "Choose"}: ${card.name}`} /><button className="kb-primary" type="button" disabled={busy || choice.cardIds?.length !== 2} onClick={() => submit({ cardIds: choice.cardIds })}>Program reset RUN cards</button></>;
  else if (isController && game.phase === "leifTarget") controls = <ChoiceButtons items={game.players.map((player, targetPlayerIndex) => ({ id: targetPlayerIndex, label: `${player.name} · ${player.bunnies.length} bunnies`, disabled: !pending.targetIndexes?.includes(targetPlayerIndex) }))} busy={busy} onPick={(targetPlayerIndex) => submit({ targetPlayerIndex })} />;
  else if (isController && game.phase === "leifPassenger") controls = <ChoiceButtons items={(game.leifCarrotson?.passengers || []).map((bunny) => ({ id: bunny.id, label: `${pending.passengerMode === "take" ? "Take" : "Discard"} ${bunny.name}` }))} busy={busy} onPick={(bunnyId) => submit({ bunnyId })} />;
  else if (isController && game.phase === "spoilsportTarget") controls = <><MultiChoice items={game.players[pending.targetPlayerIndex]?.bunnies || []} selected={choice.bunnyIds || []} onToggle={(id) => setChoice((current) => { const ids = current.bunnyIds || []; return { ...current, bunnyIds: ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id].slice(-(pending.maxKills || 1)) }; })} /><button className="kb-primary" type="button" disabled={busy || choice.bunnyIds?.length !== Math.min(pending.maxKills || 1, game.players[pending.targetPlayerIndex]?.bunnies.length || 0)} onClick={() => submit({ bunnyIds: choice.bunnyIds || [] })}>Eliminate selected bunnies</button></>;
  else if (isController && game.phase === "albinoTarget") controls = <ChoiceButtons items={game.players.map((player, targetPlayerIndex) => ({ id: targetPlayerIndex, label: `${player.name} · protect all bunnies` }))} busy={busy} onPick={(targetPlayerIndex) => submit({ targetPlayerIndex })} />;
  else if (isController && game.phase === "zodiacPrivilege") { const moves = allBunnies.flatMap(({ bunny, player, playerIndex }) => game.players.map((target, targetPlayerIndex) => targetPlayerIndex === playerIndex ? null : ({ id: `${bunny.id}|${targetPlayerIndex}`, label: `${bunny.name}: ${player.name} → ${target.name}`, bunnyId: bunny.id, targetPlayerIndex })).filter(Boolean)); const richest = Math.max(0, ...game.players.map((player, index) => index === viewerIndex ? -1 : player.carrots.length)); const carrotSources = game.players.map((player, index) => ({ player, index })).filter(({ player, index }) => index !== viewerIndex && player.carrots.length === richest); controls = <><label>Carrot source (used only for a single birth/current sign match)<select value={choice.carrotSourcePlayerIndex ?? carrotSources[0]?.index ?? ""} onChange={(event) => pick("carrotSourcePlayerIndex", Number(event.target.value))}>{carrotSources.map(({ player, index }) => <option key={player.playerId} value={index}>{player.name} ({player.carrots.length})</option>)}</select></label><ChoiceButtons items={moves} busy={busy} onPick={(id) => { const move = moves.find((entry) => entry.id === id); submit({ bunnyId: move.bunnyId, targetPlayerIndex: move.targetPlayerIndex, carrotSourcePlayerIndex: choice.carrotSourcePlayerIndex ?? carrotSources[0]?.index }); }} /><button type="button" disabled={busy} onClick={() => submit({ carrotSourcePlayerIndex: choice.carrotSourcePlayerIndex ?? carrotSources[0]?.index })}>Do not move a bunny</button></>; }
  else if (isController && game.phase === "carrotExchange") controls = <><MultiChoice items={viewer.carrots} selected={choice.ownCarrotId ? [choice.ownCarrotId] : []} onToggle={(id) => pick("ownCarrotId", id)} label={(card) => `Give Carrot ${card.label}`} />{game.players.map((player, targetPlayerIndex) => targetPlayerIndex === viewerIndex || player.carrots.length < 2 ? null : <article key={player.playerId}><b>{player.name}</b><MultiChoice items={player.carrots} selected={choice.targetPlayerIndex === targetPlayerIndex ? choice.targetCarrotIds || [] : []} onToggle={(id) => { const ids = choice.targetPlayerIndex === targetPlayerIndex ? choice.targetCarrotIds || [] : []; setChoice((current) => ({ ...current, targetPlayerIndex, targetCarrotIds: ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id].slice(-2) })); }} label={(card) => `Carrot ${card.label}`} /></article>)}<button className="kb-primary" type="button" disabled={busy || !choice.ownCarrotId || choice.targetCarrotIds?.length !== 2} onClick={() => submit()}>Exchange Carrots</button></>;
  else if (isController && ["clumsyCongenialTarget", "bountyTarget", "sinisterBounceTarget"].includes(game.phase)) { const targets = allBunnies.filter(({ bunny, playerIndex }) => game.phase === "clumsyCongenialTarget" ? /Congenial Bunny/i.test(bunny.name) : game.phase === "sinisterBounceTarget" ? playerIndex === pending.attackingPlayerIndex : true); controls = <ChoiceButtons items={targets.map(({ bunny, player }) => ({ id: bunny.id, label: `${player.name}: ${bunny.name}` }))} busy={busy} onPick={(bunnyId) => submit({ bunnyId })} />; }
  else if (isController && game.phase === "redLightDistrict") { const items = game.players.flatMap((player, targetPlayerIndex) => targetPlayerIndex === viewerIndex ? [] : [...player.bunnies, ...(player.pawns || []), ...(player.zodiacCards || [])].filter((item) => item.color === "red" || /Red|Fire/i.test(item.name || "")).map((item) => ({ id: item.id, label: `${player.name}: ${item.name}`, targetPlayerIndex }))); controls = <ChoiceButtons items={items} busy={busy} onPick={(itemId) => { const item = items.find((entry) => entry.id === itemId); submit({ itemId, targetPlayerIndex: item.targetPlayerIndex }); }} />; }
  else if (isController && game.phase === "reversalTarget") controls = <ChoiceButtons items={allBunnies.filter(({ bunny }) => bunny.id !== pending.originalBunnyId).map(({ bunny, player, playerIndex }) => ({ id: bunny.id, label: `${player.name}: ${bunny.name}`, playerIndex }))} busy={busy} onPick={(bunnyId) => { const target = allBunnies.find(({ bunny }) => bunny.id === bunnyId); submit({ bunnyId, targetPlayerIndex: target.playerIndex }); }} />;
  else if (isController && game.phase === "showBunnyExchange") { const revealed = game.players.flatMap((player, playerIndex) => playerIndex === viewerIndex ? [] : player.hand.filter((card) => pending.revealedBunnyIds?.includes(card.id)).map((card) => ({ ...card, ownerName: player.name }))); controls = <><MultiChoice items={viewer.hand} selected={choice.ownCardId ? [choice.ownCardId] : []} onToggle={(id) => pick("ownCardId", id)} /><MultiChoice items={revealed} selected={choice.bunnyCardId ? [choice.bunnyCardId] : []} onToggle={(id) => pick("bunnyCardId", id)} label={(card) => `${card.ownerName}: ${card.name}`} /><button className="kb-primary" type="button" disabled={busy || !choice.ownCardId || !choice.bunnyCardId} onClick={() => submit({ choice: "exchange" })}>Exchange</button><button type="button" disabled={busy} onClick={() => submit({ choice: "pass" })}>Pass</button></>;
  } else if (isController && game.phase === "dudePlayerChoice") controls = <div className="kb-choice-grid">{game.players.map((player, targetPlayerIndex) => !player.carrots.length ? null : <article key={player.playerId}><b>{player.name}</b><button type="button" disabled={busy} onClick={() => submit({ targetPlayerIndex, dieSides: 12 })}>Red d12</button>{game.expansionIds.includes("violet") && <button type="button" disabled={busy} onClick={() => submit({ targetPlayerIndex, dieSides: 20 })}>Clear d20 · twice</button>}</article>)}</div>;
  else if (isController && game.phase === "dudeGuess") controls = <ChoiceButtons items={[{ id: "market", label: "Kaballa’s Market" }, ...game.players.map((player, index) => ({ id: index, label: player.name }))]} busy={busy} onPick={(id) => id === "market" ? submit({ owner: "market" }) : submit({ ownerPlayerIndex: id })} />;
  else if (isController && game.phase === "dudePenalty") controls = <ChoiceButtons items={viewer.carrots.map((card) => ({ id: card.id, label: `Return Carrot ${card.label}` }))} busy={busy} onPick={(carrotId) => submit({ carrotId })} />;
  else if (isController && game.phase === "mysteryUrnDonate") controls = <ChoiceButtons items={[...viewer.bunnies.map((bunny) => ({ id: `b:${bunny.id}`, label: bunny.name })), ...viewer.carrots.map((card) => ({ id: `c:${card.id}`, label: `Carrot ${card.label}` }))]} busy={busy} onPick={(id) => id.startsWith("b:") ? submit({ bunnyId: id.slice(2) }) : submit({ carrotId: id.slice(2) })} />;
  else if (isController && game.phase === "bountyAmount") controls = <><label>Starting bounty <input type="number" min="1" max={bankTotal(viewer)} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><button className="kb-primary" type="button" disabled={busy || amount < 1 || amount > bankTotal(viewer)} onClick={() => submit({ amount })}>Place bounty</button></>;
  else if (isController && game.phase === "zepTepiChoice") { const cards = pending.adjacentIndexes.flatMap((index) => game.players[index].savedSpecials.map((card) => ({ ...card, ownerIndex: index }))); controls = <><MultiChoice items={cards} selected={choice.specialIds || []} onToggle={(id) => { const card = cards.find((entry) => entry.id === id); const selected = (choice.specialIds || []).filter((entry) => cards.find((candidate) => candidate.id === entry)?.ownerIndex !== card.ownerIndex); pick("specialIds", [...selected, id]); }} /><button className="kb-primary" type="button" disabled={busy} onClick={() => submit({ specialIds: choice.specialIds || [] })}>Take selected Specials</button></>; }

  return <div className="kb-modal-backdrop"><section className="kb-special-choice kb-expanded-action" role="dialog" aria-modal="true"><GameCard card={pending.card || { name: "Card action", kind: "action", type: "RUN" }} /><div><span className="kb-kicker"><Dices size={15} /> Official card action</span><h2>{pending.card?.name || "Resolve the roll"}</h2><p>{game.message}</p>{isController ? <div className="kb-expanded-controls">{controls || <button className="kb-primary" type="button" disabled={busy} onClick={() => submit()}>Continue</button>}</div> : <p>Waiting for {controller?.name || "the active player"}.</p>}</div></section></div>;
}

function ChoiceButtons({ items, busy, onPick }) {
  return <div className="kb-choice-grid">{items.filter(Boolean).map((item) => <button key={item.id} type="button" disabled={busy || item.disabled} onClick={() => onPick(item.id)}>{item.label}</button>)}</div>;
}

function MultiChoice({ items = [], selected, onToggle, label = (item) => item.name }) {
  return <div className="kb-multi-choice">{items.map((item) => <button className={selected.includes(item.id) ? "selected" : ""} key={item.id} type="button" onClick={() => onToggle(item.id)}>{label(item)}</button>)}</div>;
}

function DefenseDialog({ pending, player, busy, onChoice }) {
  const bunny = player.bunnies.find((entry) => entry.id === pending.bunnyId);
  const isWeapon = pending.effect === "weapon";
  const cabbageCost = pending.card.cabbageCost || 0;
  const waterCost = pending.card.waterCost || 0;
  const cabbageUnits = getKillerBunniesSupplyUnits(player, "cabbage");
  const waterUnits = getKillerBunniesSupplyUnits(player, "water");
  const canFeed = cabbageUnits >= cabbageCost && waterUnits >= waterCost;
  const defenseUnits = getKillerBunniesDefenseUnits(player);
  const effectivePower = Number.isFinite(pending.effectivePower) ? pending.effectivePower : pending.card.power;
  const defensePower = pending.card.defensePower || pending.card.power;
  const rollLabel = Number(pending.card.number) === 347 ? "seven colored d12s" : Number(pending.card.power) >= 13 ? "Clear d20" : "d12";
  return <div className="kb-modal-backdrop"><section className="kb-defense-choice" role="dialog" aria-modal="true" aria-labelledby="kb-defense-title"><div className="kb-defense-cards"><GameCard card={pending.card} /><span><Target /> targets</span>{bunny && <div><MiniBunny bunny={bunny} /><b>{bunny.name}</b></div>}</div><div><span className="kb-kicker">{isWeapon ? <><Target size={15} /> Bunny under attack</> : <><Leaf size={15} /> Feeding required</>}</span><h2 id="kb-defense-title">{isWeapon ? "Defend or roll." : "Will you feed your bunny?"}</h2>{isWeapon ? <><p>This weapon succeeds when the required {rollLabel} result is <strong>{effectivePower} or lower</strong>.{pending.cloverReduction > 0 && <> Lucky Clovers reduced its printed level from <b>{pending.card.power}</b> by <b>{pending.cloverReduction}</b>. Defense Cards still use the printed level.</>} You have <b>{defenseUnits} Defense units</b>.{player.shields > 0 ? " Your burrow shield will block this attack after the roll." : ""}</p><div className="kb-defense-actions"><button className="kb-primary kb-defense-roll" type="button" disabled={busy} onClick={() => onChoice("roll")}><span>{rollLabel}</span> Roll now</button>{gameHasDefense(player) && <button type="button" disabled={busy || defenseUnits < defensePower} onClick={() => onChoice("defense")}><Shield size={17} /> Spend {defensePower} DEF</button>}</div></> : <><p><strong>{pending.card.name}</strong> requires <b>{cabbageCost} cabbage</b> and <b>{waterCost} water</b>. You currently have {cabbageUnits} cabbage units and {waterUnits} water units.</p><div className={`kb-feed-status ${canFeed ? "ready" : "short"}`}><Leaf /> {canFeed ? "You have enough supplies to feed this bunny." : "You do not have enough supplies to feed this bunny."}</div><div className="kb-defense-actions"><button className="kb-primary" type="button" disabled={busy || !canFeed} onClick={() => onChoice("feed")}><Leaf size={17} /> Feed {cabbageCost} + {waterCost}</button><button type="button" disabled={busy} onClick={() => onChoice("decline")}>{player.shields > 0 ? <><Shield size={17} /> Use burrow shield</> : <>Do not feed</>}</button></div></>}</div></section></div>;
}

function CardDiceDialog({ pending, busy, onRoll }) {
  const card = pending.card;
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-card-dice-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-card-dice-title"><GameCard card={card} /><div><span className="kb-kicker"><Dices size={15} /> Card dice action</span><h2 id="kb-card-dice-title">Roll for {card.name}</h2><p className="kb-manual-ability">{card.ability || card.detail}</p><p className="kb-manual-note">Choose the die or printed group below. The server rolls it and records the result for everyone at the table.</p><div className="kb-card-dice-actions">{pending.diceChoices.map((choice) => <button className="kb-primary" type="button" key={choice.id} disabled={busy} onClick={() => onRoll(choice.id)}><Dices size={18} /> {choice.label}</button>)}</div></div></section></div>;
}

function ManualResolutionDialog({ pending, busy, onRoll, onConfirm }) {
  const card = pending.card;
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution" role="dialog" aria-modal="true" aria-labelledby="kb-manual-title"><GameCard card={card} /><div><span className="kb-kicker"><BookOpen size={15} /> Guided card ruling</span><h2 id="kb-manual-title">Resolve {card.name}</h2><p className="kb-manual-ability">{card.ability || card.detail}</p>{pending.diceRolls?.length > 0 && <><strong>Recorded rolls</strong><div className="kb-card-dice-results">{pending.diceRolls.map((roll, index) => <span key={`${roll.choiceId}-${index}`}><b>{roll.label}</b><small>{roll.results.map(formatCardDieResult).join(" · ")}</small></span>)}</div></>}<strong>Before playing</strong><ul>{(card.requirements || []).map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><p className="kb-manual-note">This interaction is documented but not fully automated yet. Apply the displayed rolls and remaining choices with the other players, then continue.</p><div>{pending.diceChoices?.map((choice) => <button type="button" key={choice.id} disabled={busy} onClick={() => onRoll(choice.id)}><Dices size={16} /> Roll again: {choice.label}</button>)}<a href={`/killer-bunnies/cards?card=${card.catalogNumber || ""}`} target="_blank" rel="noreferrer"><Library size={16} /> Open card record</a><button className="kb-primary" type="button" disabled={busy} onClick={onConfirm}><CheckCircleIcon /> Mark resolved</button></div></div></section></div>;
}

function formatCardDieResult(result) {
  return `${result.color ? `${result.color[0].toUpperCase()}${result.color.slice(1)} ` : ""}d${result.sides}: ${result.value}`;
}

function BunnyAuctionDialog({ phase, pending, players, viewerIndex, busy, onTarget, onBid }) {
  const minimumBid = (pending.currentBid || 0) + 1;
  const [bid, setBid] = useState(minimumBid);
  const isController = pending.playerIndex === viewerIndex;
  const viewerDolla = bankTotal(players[viewerIndex]);
  const targetPlayer = players[pending.targetPlayerIndex];
  const targetBunny = targetPlayer?.bunnies.find((bunny) => bunny.id === pending.bunnyId);

  useEffect(() => setBid(minimumBid), [minimumBid, pending.playerIndex]);

  if (phase === "auctionTarget") {
    return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-auction-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-auction-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Coins size={15} /> Bunny Block Bid</span><h2 id="kb-auction-title">Choose a bunny to auction.</h2><p className="kb-manual-ability">Any bunny in the Bunny Circle may be selected, including one protected by a Heavenly Halo. Attached modifiers travel with the bunny.</p><div className="kb-defector-targets">{players.flatMap((player, playerIndex) => player.bunnies.map((bunny) => <button key={`${player.playerId}-${bunny.id}`} type="button" disabled={busy || !isController} onClick={() => onTarget(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>Owned by {player.name}</small></span></button>))}</div>{!isController && <p className="kb-manual-note">Waiting for {players[pending.playerIndex]?.name} to choose the auctioned bunny.</p>}</div></section></div>;
  }

  const highBidder = pending.highestBidderIndex === null ? null : players[pending.highestBidderIndex];
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-auction-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-auction-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Coins size={15} /> Live bunny auction</span><h2 id="kb-auction-title">Who wants {pending.bunnyName}?</h2>{targetBunny && <div className="kb-defector-bunny"><MiniBunny bunny={targetBunny} /><span><b>{targetBunny.name}</b><small>Currently owned by {targetPlayer.name}</small></span></div>}<div className="kb-auction-board"><span><small>Current bid</small><strong>{pending.currentBid}<Coins /></strong><b>{highBidder ? highBidder.name : "No bids yet"}</b></span><span><small>Now bidding</small><strong>{players[pending.playerIndex]?.name}</strong><b>{bankTotal(players[pending.playerIndex])} Dolla available</b></span></div><div className="kb-auction-history">{pending.bidHistory.map((entry, index) => <span key={`${entry.playerIndex}-${index}`}><b>{players[entry.playerIndex].name}</b><small>{entry.action === "pass" ? "passed" : `bid ${entry.amount} Dolla`}</small></span>)}{!pending.bidHistory.length && <p>The card player opens the bidding.</p>}</div>{isController ? <div className="kb-auction-actions"><label>YOUR BID<input type="number" min={minimumBid} max={viewerDolla} step="1" value={bid} onChange={(event) => setBid(Number(event.target.value))} /></label><button className="kb-primary" type="button" disabled={busy || !Number.isInteger(bid) || bid < minimumBid || bid > viewerDolla} onClick={() => onBid(bid)}><Coins size={17} /> Bid {Number.isFinite(bid) ? bid : minimumBid}</button><button type="button" disabled={busy} onClick={() => onBid(null)}><X size={16} /> Pass</button></div> : <p className="kb-manual-note">Waiting for {players[pending.playerIndex]?.name} to raise or pass.</p>}<p className="kb-manual-note">The final winner pays the bid to Kaballa’s discard pile and takes the bunny with its attached cards.</p></div></section></div>;
}

function BunnyExchangeDialog({ phase, pending, players, viewerIndex, busy, onGive, onExchange }) {
  const isController = pending.playerIndex === viewerIndex;
  const [targetPlayerIndex, setTargetPlayerIndex] = useState(null);
  const [selectedBunnyIds, setSelectedBunnyIds] = useState([]);
  const targetPlayer = targetPlayerIndex === null ? null : players[targetPlayerIndex];
  const requiredCount = targetPlayer ? Math.min(2, targetPlayer.bunnies.length) : 0;

  useEffect(() => {
    setTargetPlayerIndex(null);
    setSelectedBunnyIds([]);
  }, [phase, pending.giveBunnyId]);

  const toggleReceivedBunny = (playerIndex, bunnyId) => {
    if (playerIndex !== targetPlayerIndex) {
      setTargetPlayerIndex(playerIndex);
      setSelectedBunnyIds([bunnyId]);
      return;
    }
    setSelectedBunnyIds((current) => current.includes(bunnyId)
      ? current.filter((id) => id !== bunnyId)
      : current.length < Math.min(2, players[playerIndex].bunnies.length) ? [...current, bunnyId] : current);
  };

  if (phase === "bunnyExchangeGive") {
    const giver = players[pending.playerIndex];
    return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-exchange-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-exchange-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Rabbit size={15} /> Bunny Exchange</span><h2 id="kb-exchange-title">Choose the bunny you will give.</h2><p className="kb-manual-ability">You choose every bunny in this exchange. Modifiers, Halo cards, and pending feeding obligations remain attached when ownership changes.</p><div className="kb-defector-targets">{giver.bunnies.map((bunny) => <button key={bunny.id} type="button" disabled={busy || !isController} onClick={() => onGive(bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>Give this bunny away</small></span></button>)}</div>{!isController && <p className="kb-manual-note">Waiting for {giver.name} to choose a bunny.</p>}</div></section></div>;
  }

  const giver = players[pending.playerIndex];
  const givenBunny = giver.bunnies.find((bunny) => bunny.id === pending.giveBunnyId);
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-exchange-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-exchange-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Rabbit size={15} /> Bunny Exchange</span><h2 id="kb-exchange-title">Choose what you receive.</h2>{givenBunny && <div className="kb-defector-bunny"><MiniBunny bunny={givenBunny} /><span><b>{givenBunny.name}</b><small>Your bunny being given away</small></span></div>}<p className="kb-manual-note">Digital rule variant: select two bunnies from one opponent. If that opponent owns only one bunny, select that bunny for a one-for-one exchange.</p><div className="kb-exchange-opponents">{players.map((player, playerIndex) => playerIndex === pending.playerIndex || !player.bunnies.length ? null : <section key={player.playerId} className={targetPlayerIndex === playerIndex ? "selected" : ""}><header><b>{player.name}</b><small>Select {Math.min(2, player.bunnies.length)} {player.bunnies.length === 1 ? "bunny" : "bunnies"}</small></header><div>{player.bunnies.map((bunny) => <button className={targetPlayerIndex === playerIndex && selectedBunnyIds.includes(bunny.id) ? "selected" : ""} key={bunny.id} type="button" disabled={busy || !isController} onClick={() => toggleReceivedBunny(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>{selectedBunnyIds.includes(bunny.id) ? "Selected" : "Choose"}</small></span></button>)}</div></section>)}</div>{isController ? <div><button className="kb-primary" type="button" disabled={busy || targetPlayerIndex === null || selectedBunnyIds.length !== requiredCount} onClick={() => onExchange(targetPlayerIndex, selectedBunnyIds)}><Rabbit size={17} /> Complete {requiredCount === 1 ? "1-for-1" : "2-for-1"} exchange</button></div> : <p className="kb-manual-note">Waiting for {giver.name} to select the other side of the exchange.</p>}</div></section></div>;
}

function EveryoneFeedDialog({ pending, players, viewerIndex, busy, onChoose }) {
  const chooser = players[pending.playerIndex];
  const isController = pending.playerIndex === viewerIndex;
  const cabbageCost = pending.card.cabbageCost || 0;
  const waterCost = pending.card.waterCost || 0;
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-everyone-feed-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-everyone-feed-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Leaf size={15} /> Everyone Feed A Bunny</span><h2 id="kb-everyone-feed-title">{isController ? "Choose one of your bunnies." : `Waiting for ${chooser.name}.`}</h2><p className="kb-manual-ability">Every opponent of {players[pending.attackingPlayerIndex]?.name} must choose one bunny to feed <b>{cabbageCost} Cabbage</b> and <b>{waterCost} Water</b> by the end of their next turn, or lose that bunny. The card player is excluded.</p><div className="kb-defector-targets">{chooser.bunnies.map((bunny) => <button key={bunny.id} type="button" disabled={busy || !isController} onClick={() => onChoose(bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>{isController ? `Feed ${cabbageCost} Cabbage + ${waterCost} Water` : `${chooser.name} is choosing`}</small></span></button>)}</div><p className="kb-manual-note">After choosing, the obligation remains visible on that player’s mat. Missing supplies may be bought during that player’s next turn before feeding is checked.</p></div></section></div>;
}

function BlackCatDialog({ phase, pending, players, viewerIndex, busy, onTarget, onRoll, onPlace, onDiscard }) {
  const isController = pending.playerIndex === viewerIndex;
  const eligibleTargets = players.flatMap((player, playerIndex) => player.bunnies
    .filter((bunny) => getKillerBunniesCloverCards(bunny).length)
    .map((bunny) => ({ player, playerIndex, bunny })));

  if (phase === "blackCatTarget") {
    return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-black-cat-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-black-cat-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Sparkles size={15} /> Black Cat</span><h2 id="kb-black-cat-title">Choose a bunny carrying Clovers.</h2><p className="kb-manual-ability">Remove every Clover card from one bunny in the Bunny Circle. Other modifiers under that bunny remain in place.</p><div className="kb-defector-targets">{eligibleTargets.map(({ player, playerIndex, bunny }) => <button key={`${player.playerId}-${bunny.id}`} type="button" disabled={busy || !isController} onClick={() => onTarget(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>{player.name} · {getKillerBunniesCloverCards(bunny).length} Clover card{getKillerBunniesCloverCards(bunny).length === 1 ? "" : "s"}</small></span></button>)}</div></div></section></div>;
  }

  if (phase === "blackCatRoll") {
    return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-black-cat-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-black-cat-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Dices size={15} /> Black Cat roll</span><h2 id="kb-black-cat-title">The Clovers are off {pending.bunnyName}.</h2><p className="kb-manual-ability">Roll the Green d12. An odd result lets the card player place each removed Clover beneath any bunny—or discard it. An even result discards every removed Clover.</p><div className="kb-defector-actions">{isController ? <button className="kb-primary" type="button" disabled={busy} onClick={onRoll}><Dices size={18} /> Roll Green d12</button> : <p>Waiting for {players[pending.playerIndex]?.name} to roll.</p>}</div></div></section></div>;
  }

  const currentClover = pending.clovers?.[0];
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-black-cat-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-black-cat-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Sparkles size={15} /> Odd roll · relocate Clovers</span><h2 id="kb-black-cat-title">Place or discard {currentClover?.name}.</h2><p className="kb-manual-ability">Choose any bunny for this Clover. Repeat separately for the remaining {pending.clovers?.length || 0} Clover card{pending.clovers?.length === 1 ? "" : "s"}.</p><div className="kb-defector-targets">{players.flatMap((player, playerIndex) => player.bunnies.map((bunny) => <button key={`${player.playerId}-${bunny.id}`} type="button" disabled={busy || !isController} onClick={() => onPlace(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>Place under {player.name}'s bunny</small></span></button>))}</div><div className="kb-defector-actions">{isController ? <button type="button" disabled={busy} onClick={onDiscard}><X size={16} /> Discard this Clover</button> : <p>Waiting for {players[pending.playerIndex]?.name} to place or discard it.</p>}</div></div></section></div>;
}

function ImmediateCardDialog({ pending, player, players, viewerIndex, busy, onConfirm, onTarget }) {
  const choosingBunny = pending.effect === "terribleMisfortune";
  const card = pending.card;
  const targetPlayers = pending.targetScope === "opponent"
    ? players.map((entry, index) => ({ entry, index })).filter(({ index }) => index !== viewerIndex)
    : [{ entry: player, index: viewerIndex }];
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-immediate-resolution" role="dialog" aria-modal="true" aria-labelledby="kb-immediate-title"><GameCard card={card} /><div><span className="kb-kicker"><Target size={15} /> PLAY IMMEDIATELY</span><h2 id="kb-immediate-title">{choosingBunny ? "Choose the affected bunny" : `Resolve ${card.name}`}</h2><p className="kb-manual-ability">{card.ability || card.detail}</p>{choosingBunny ? <><strong>{pending.targetScope === "opponent" ? "Opponent’s vulnerable bunnies" : "Your vulnerable bunnies"}</strong><div className="kb-immediate-targets">{targetPlayers.flatMap(({ entry, index }) => entry.bunnies.filter((bunny) => !(bunny.modifiers || []).some((modifier) => /Heavenly Halo/i.test(modifier.name))).map((bunny) => <button key={bunny.id} type="button" disabled={busy} onClick={() => onTarget(index, bunny.id)}><MiniBunny bunny={bunny} /><span>Eliminate {entry.name}’s {bunny.name}</span></button>))}</div></> : <><strong>Required action</strong><ul>{(card.requirements || []).map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><p className="kb-manual-note">This card was revealed directly from the draw pile. It is not in your hand and cannot be saved or programmed as a RUN card. Complete the action above now.</p><div><a href={`/killer-bunnies/cards?card=${card.catalogNumber || ""}`} target="_blank" rel="noreferrer"><Library size={16} /> Open card record</a><button className="kb-primary" type="button" disabled={busy} onClick={onConfirm}><CheckCircleIcon /> Action complete</button></div></>}</div></section></div>;
}

function ModifierTargetDialog({ pending, players, busy, onTarget }) {
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-modifier-target" role="dialog" aria-modal="true" aria-labelledby="kb-modifier-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Sparkles size={15} /> Bunny Modifier</span><h2 id="kb-modifier-title">Choose any bunny</h2><p className="kb-manual-ability">Place {pending.card.name} under one bunny in the Bunny Circle. More modifiers may be added later, but an attached modifier cannot be moved.</p><div className="kb-modifier-bunnies">{players.flatMap((player, playerIndex) => player.bunnies.map((bunny) => <button key={`${player.playerId}-${bunny.id}`} type="button" disabled={busy} onClick={() => onTarget(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>{player.name}{getKillerBunniesCloverReduction(bunny) ? ` · Clover −${getKillerBunniesCloverReduction(bunny)}` : ""}</small></span></button>))}</div></div></section></div>;
}

function PlayerTargetDialog({ pending, players, busy, onTarget }) {
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-player-target-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-player-target-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Users size={15} /> Choose a player</span><h2 id="kb-player-target-title">Who receives {pending.card.name}?</h2><p className="kb-manual-ability">{pending.card.ability || pending.card.detail}</p><div className="kb-player-targets">{players.map((player, playerIndex) => <button key={player.playerId} type="button" disabled={busy} onClick={() => onTarget(playerIndex)}><span className={`kb-avatar avatar-${playerIndex % 6}`}>{player.isComputer ? <Bot /> : player.name[0]}</span><span><b>{player.name}</b><small>{player.bunnies.length} bunnies · {player.handCount ?? player.hand.length} cards</small></span></button>)}</div></div></section></div>;
}

function UtilityBunnyTargetDialog({ pending, players, busy, onTarget }) {
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-player-target-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-utility-target-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Rabbit size={15} /> Choose a bunny</span><h2 id="kb-utility-target-title">Select the affected bunny.</h2><p className="kb-manual-ability">{pending.card.ability || pending.card.detail}</p><div className="kb-defector-targets">{players.flatMap((player, playerIndex) => player.bunnies.map((bunny) => <button key={`${player.playerId}-${bunny.id}`} type="button" disabled={busy} onClick={() => onTarget(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>{player.name}</small></span></button>))}</div></div></section></div>;
}

function PovertyPokerDialog({ phase, pending, players, viewerIndex, busy, onCall, onAnte, onRoll }) {
  const emptyStakes = { dolla: 0, cabbage: 0, water: 0, defense: 0, carrots: 0, bunnies: 0, specials: 0, pawns: 0, zodiacs: 0, mysteriousPlaces: 0 };
  const [stakes, setStakes] = useState(emptyStakes);
  const [selections, setSelections] = useState({ bunnyIds: [], carrotIds: [], specialIds: [], pawnIds: [], zodiacIds: [], mysteriousPlaceIds: [] });
  const controller = players[pending.playerIndex];
  const isController = pending.playerIndex === viewerIndex;
  const calledStakes = pending.stakes || emptyStakes;
  const labels = { dolla: "Dolla", cabbage: "Cabbage Units", water: "Water Units", defense: "Defense Units", carrots: "Carrots", bunnies: "Bunnies", specials: "Saved Specials", pawns: "Pawns", zodiacs: "Zodiac cards", mysteriousPlaces: "Mysterious Places" };
  const availability = controller ? {
    dolla: bankTotal(controller),
    cabbage: getKillerBunniesSupplyUnits(controller, "cabbage"),
    water: getKillerBunniesSupplyUnits(controller, "water"),
    defense: getKillerBunniesDefenseUnits(controller),
    carrots: controller.carrots?.length || 0,
    bunnies: controller.bunnies?.length || 0,
    specials: controller.savedSpecials?.length || 0,
    pawns: controller.pawns?.length || 0,
    zodiacs: controller.zodiacCards?.length || 0,
    mysteriousPlaces: controller.mysteriousPlaces?.length || 0,
  } : emptyStakes;

  useEffect(() => {
    setSelections({ bunnyIds: [], carrotIds: [], specialIds: [], pawnIds: [], zodiacIds: [], mysteriousPlaceIds: [] });
  }, [phase, pending.playerIndex]);

  function toggleSelection(key, id, required) {
    setSelections((current) => {
      const selected = current[key] || [];
      if (selected.includes(id)) return { ...current, [key]: selected.filter((entry) => entry !== id) };
      if (selected.length >= required) return current;
      return { ...current, [key]: [...selected, id] };
    });
  }

  const stakeEntries = Object.entries(calledStakes).filter(([, amount]) => amount > 0);
  const selectionGroups = controller ? [
    { stake: "bunnies", key: "bunnyIds", values: controller.bunnies || [], label: "bunny" },
    { stake: "carrots", key: "carrotIds", values: controller.carrots || [], label: "Carrot" },
    { stake: "specials", key: "specialIds", values: controller.savedSpecials || [], label: "saved Special" },
    { stake: "pawns", key: "pawnIds", values: controller.pawns || [], label: "Pawn" },
    { stake: "zodiacs", key: "zodiacIds", values: controller.zodiacCards || [], label: "Zodiac card" },
    { stake: "mysteriousPlaces", key: "mysteriousPlaceIds", values: controller.mysteriousPlaces || [], label: "Mysterious Place" },
  ].filter((group) => calledStakes[group.stake] > 0) : [];
  const anteReady = selectionGroups.every((group) => selections[group.key].length === calledStakes[group.stake]);
  const callerCanCover = Object.entries(stakes).every(([key, amount]) => amount <= (availability[key] || 0));
  const hasStake = Object.values(stakes).some((amount) => amount > 0);
  const highRoll = Math.max(0, ...(pending.contenderIndexes || []).map((index) => pending.scores?.[index] || 0));

  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-auction-dialog kb-poverty-poker-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-poverty-poker-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Dices size={15} /> Poverty Poker</span>
    {phase === "povertyPokerCall" && <><h2 id="kb-poverty-poker-title">Call the complete stake.</h2><p className="kb-manual-ability">Combine any supported items. You must cover the full call, and every other player who can cover every listed item must enter.</p><div className="kb-poverty-stake-grid">{Object.keys(emptyStakes).map((key) => <label key={key}><span>{labels[key]} <small>{availability[key]} available</small></span><input type="number" min="0" max={availability[key]} step="1" value={stakes[key]} disabled={busy || !isController} onChange={(event) => setStakes((current) => ({ ...current, [key]: Math.max(0, Number(event.target.value) || 0) }))} /></label>)}</div>{isController ? <button className="kb-primary" type="button" disabled={busy || !hasStake || !callerCanCover} onClick={() => onCall(stakes)}><Coins size={17} /> Call Poverty Poker</button> : <p className="kb-manual-note">Waiting for {controller?.name} to declare the stakes.</p>}</>}
    {phase === "povertyPokerAnte" && <><h2 id="kb-poverty-poker-title">{isController ? "Choose exactly what you will risk." : `Waiting for ${controller?.name} to ante.`}</h2><PovertyPokerStakeSummary entries={stakeEntries} labels={labels} multiplier={pending.eligiblePlayerIndexes?.length || 1} /><p className="kb-manual-note">Dolla and unit stakes are collected automatically. Each player chooses their own bunnies, Carrots, and face-up cards. Attached modifiers and feeding obligations travel with a gambled bunny.</p>{selectionGroups.map((group) => <div className="kb-poverty-selection" key={group.key}><b>Choose {calledStakes[group.stake]} {group.label}{calledStakes[group.stake] === 1 ? "" : "s"}</b><div className="kb-defector-targets">{group.values.map((item) => { const selected = selections[group.key].includes(item.id); return <button className={selected ? "selected" : ""} key={item.id} type="button" disabled={busy || !isController} onClick={() => toggleSelection(group.key, item.id, calledStakes[group.stake])}>{group.stake === "bunnies" ? <MiniBunny bunny={item} /> : group.stake === "carrots" ? <Carrot /> : group.stake === "pawns" ? <Rabbit /> : <Sparkles />}<span><b>{item.name || (item.label ? `Carrot ${item.label}` : group.label)}</b><small>{selected ? "In your ante" : "Select"}</small></span></button>; })}</div></div>)}{isController && <button className="kb-primary" type="button" disabled={busy || !anteReady} onClick={() => onAnte(selections)}><Coins size={17} /> Place complete ante</button>}</>}
    {["povertyPokerRoll", "povertyPokerReroll"].includes(phase) && <><h2 id="kb-poverty-poker-title">{phase === "povertyPokerReroll" ? "Keep it—or roll once more." : pending.roundNumber > 1 ? `Tie-break roll ${pending.roundNumber - 1}` : "Everybody eligible rolls."}</h2><PovertyPokerStakeSummary entries={stakeEntries} labels={labels} multiplier={pending.eligiblePlayerIndexes?.length || 1} /><div className="kb-defector-scores">{players.map((player, index) => { const eligible = pending.eligiblePlayerIndexes?.includes(index); const contender = pending.contenderIndexes?.includes(index); const score = pending.scores?.[index]; return <span key={player.playerId} className={`${pending.playerIndex === index ? "rolling" : ""} ${!eligible || !contender ? "out" : ""}`}><b>{player.name}</b><strong>{eligible && Number.isFinite(score) ? score : "—"}</strong><small>{!eligible ? "could not cover stake" : !contender ? "out" : pending.playerIndex === index ? "roll now" : Number.isFinite(score) ? score === highRoll ? "current high" : "rolled" : "waiting"}</small></span>; })}</div>{phase === "povertyPokerReroll" ? <><p className="kb-manual-ability">The card player may keep <b>{pending.scores?.[pending.cardPlayerIndex]}</b> or replace it with one final d12 result.</p><div className="kb-defector-actions">{isController ? <><button type="button" disabled={busy} onClick={() => onRoll("keep")}>Keep roll</button><button className="kb-primary" type="button" disabled={busy} onClick={() => onRoll("reroll")}><Dices size={17} /> Replace with reroll</button></> : <p>Waiting for {controller?.name} to decide.</p>}</div></> : <div className="kb-defector-actions">{isController ? <button className="kb-primary" type="button" disabled={busy} onClick={() => onRoll("roll")}><Dices size={18} /> Roll any d12</button> : <p>Waiting for {controller?.name} to roll.</p>}</div>}</>}
  </div></section></div>;
}

function PovertyPokerStakeSummary({ entries, labels, multiplier }) {
  return <div className="kb-auction-board"><span><small>Stake per player</small><strong>{entries.map(([key, amount]) => `${amount} ${labels[key]}`).join(" + ")}</strong><b>{multiplier} mandatory participant{multiplier === 1 ? "" : "s"}</b></span><span><small>Complete pot</small><strong>{entries.map(([key, amount]) => `${amount * multiplier} ${labels[key]}`).join(" + ")}</strong><b>Highest d12 takes everything</b></span></div>;
}

function DefectorDetectorDialog({ phase, pending, players, viewerIndex, busy, onTarget, onDiscard, onRoll }) {
  const isController = pending.playerIndex === viewerIndex;
  const targetPlayer = players[pending.targetPlayerIndex];
  const targetBunny = targetPlayer?.bunnies.find((bunny) => bunny.id === pending.bunnyId);
  const highRoll = Math.max(0, ...(pending.scores || []).filter(Number.isFinite));

  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-defector-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-defector-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Dices size={15} /> Defector Detector</span>{phase === "defectorTarget" ? <><h2 id="kb-defector-title">Choose a bunny—or discard.</h2><p className="kb-manual-ability">Every player will roll a d12. The highest roller takes the selected bunny, along with anything attached to it.</p><div className="kb-defector-targets">{players.flatMap((player, playerIndex) => player.bunnies.map((bunny) => <button key={`${player.playerId}-${bunny.id}`} type="button" disabled={busy || !isController} onClick={() => onTarget(playerIndex, bunny.id)}><MiniBunny bunny={bunny} /><span><b>{bunny.name}</b><small>Currently owned by {player.name}</small></span></button>))}</div><div className="kb-defector-actions">{isController ? <button type="button" disabled={busy} onClick={onDiscard}><X size={16} /> Discard without using</button> : <p>Waiting for {players[pending.playerIndex]?.name} to choose a bunny.</p>}</div></> : <><h2 id="kb-defector-title">{phase === "defectorReroll" ? "Keep it—or roll once more." : pending.roundNumber > 1 ? `Tie-break roll ${pending.roundNumber - 1}` : "Everybody rolls."}</h2>{targetBunny && <div className="kb-defector-bunny"><MiniBunny bunny={targetBunny} /><span><b>{targetBunny.name}</b><small>{targetPlayer.name}'s bunny · winner takes it</small></span></div>}<div className="kb-defector-scores">{players.map((player, index) => { const score = pending.scores?.[index]; const isContender = pending.contenderIndexes?.includes(index); return <span key={player.playerId} className={`${pending.playerIndex === index ? "rolling" : ""} ${!isContender ? "out" : ""}`}><b>{player.name}</b><strong>{Number.isFinite(score) ? score : "—"}</strong><small>{!isContender ? "out" : pending.playerIndex === index ? "roll now" : Number.isFinite(score) ? score === highRoll ? "current high" : "rolled" : "waiting"}</small></span>; })}</div>{phase === "defectorReroll" ? <><p className="kb-manual-ability">Your first roll is below the current high of <b>{highRoll}</b>. A reroll replaces your first result, even if the new number is lower.</p><div className="kb-defector-actions">{isController ? <><button type="button" disabled={busy} onClick={() => onRoll("keep")}>Keep {pending.scores[viewerIndex]}</button><button className="kb-primary" type="button" disabled={busy} onClick={() => onRoll("reroll")}><Dices size={17} /> Use optional reroll</button></> : <p>Waiting for {players[pending.playerIndex]?.name} to decide.</p>}</div></> : <div className="kb-defector-actions">{isController ? <button className="kb-primary" type="button" disabled={busy} onClick={() => onRoll("roll")}><Dices size={18} /> Roll d12</button> : <p>Waiting for {players[pending.playerIndex]?.name} to roll.</p>}</div>}</>}</div></section></div>;
}

function AreaWeaponDialog({ pending, players, viewerIndex, busy, onRoll }) {
  const isController = pending.playerIndex === viewerIndex;
  const currentId = pending.rollQueue?.[0];
  const current = pending.affected.find((entry) => (entry.attackId || entry.bunnyId) === currentId);
  const sides = Number(current?.power) >= 13 ? 20 : 12;
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-area-weapon-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-area-weapon-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Target size={15} /> Area weapon</span><h2 id="kb-area-weapon-title">The Bunny Circle is under fire.</h2><p className="kb-manual-ability">Each affected bunny resolves its own d{sides} roll. Lucky Clovers reduce that bunny’s effective Weapon Level. A bunny reached twice by a wraparound weapon rolls twice.</p><div className="kb-area-targets">{pending.affected.map((entry) => <span key={entry.attackId || entry.bunnyId} className={`${(entry.attackId || entry.bunnyId) === currentId ? "rolling" : ""} ${entry.protected ? "protected" : ""} ${entry.eliminated ? "eliminated" : ""}`}><b>{entry.name}</b><strong>{entry.protected ? <Shield /> : entry.roll ?? `≤${entry.power}`}</strong><small>{entry.protected ? "Halo protected" : entry.eliminated ? "eliminated" : entry.roll ? `rolled · effective ${entry.effectivePower}` : `${players[entry.playerIndex]?.name} · distance ${entry.distance}`}</small></span>)}</div><div className="kb-defector-actions">{isController ? <button className="kb-primary" type="button" disabled={busy} onClick={onRoll}><Dices size={18} /> Roll d{sides} for {current?.name}</button> : <p>Waiting for {players[pending.playerIndex]?.name} to roll for {current?.name}.</p>}</div></div></section></div>;
}

function BlueCardRollDialog({ pending, players, viewerIndex, busy, onRoll }) {
  const isController = pending.playerIndex === viewerIndex;
  const targetPlayer = players[pending.targetPlayerIndex];
  const targetBunny = targetPlayer?.bunnies.find((bunny) => bunny.id === pending.bunnyId);
  const rollLabel = pending.diceCount > 1 ? `Roll ${pending.diceCount} d12s` : `Roll ${[310, 311].includes(Number(pending.card?.number)) ? "Red " : ""}d12`;
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-blue-roll-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-blue-roll-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Dices size={15} /> Blue Bunny Bits roll</span><h2 id="kb-blue-roll-title">{rollLabel}{targetBunny ? ` for ${targetBunny.name}` : ""}.</h2><p className="kb-manual-ability">{pending.card.ability || pending.card.detail}</p>{targetBunny && <div className="kb-defector-bunny"><MiniBunny bunny={targetBunny} /><span><b>{targetBunny.name}</b><small>Owned by {targetPlayer?.name}</small></span></div>}<div className="kb-defector-actions">{isController ? <button className="kb-primary" type="button" disabled={busy} onClick={onRoll}><Dices size={18} /> {rollLabel}</button> : <p>Waiting for {players[pending.playerIndex]?.name} to roll.</p>}</div></div></section></div>;
}

function NumberChoiceDialog({ pending, viewerIndex, busy, onChoose }) {
  const isController = pending.playerIndex === viewerIndex;
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-blue-roll-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-number-choice-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Dices size={15} /> Pick a lucky number</span><h2 id="kb-number-choice-title">Choose a number from 1 through 12.</h2><p className="kb-manual-ability">Each matching result among the five dice revives one discarded bunny.</p><div className="kb-number-grid">{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <button key={value} type="button" disabled={busy || !isController} onClick={() => onChoose(value)}>{value}</button>)}</div></div></section></div>;
}

function ReviveBunnyDialog({ pending, game, viewerIndex, busy, onChoose }) {
  const isController = pending.playerIndex === viewerIndex;
  const discarded = [...(game.weilsPawnShop?.bunnyDiscard || []), ...game.discardPile.filter((card) => card.kind === "bunny")];
  return <div className="kb-modal-backdrop"><section className="kb-manual-resolution kb-player-target-dialog" role="dialog" aria-modal="true" aria-labelledby="kb-revive-title"><GameCard card={pending.card} /><div><span className="kb-kicker"><Sparkles size={15} /> Revive a bunny</span><h2 id="kb-revive-title">Choose {pending.reviveCount} discarded bunn{pending.reviveCount === 1 ? "y" : "ies"}.</h2><p className="kb-manual-ability">The selected bunny returns directly to your Bunny Circle.</p><div className="kb-revive-grid">{discarded.map((bunny) => <button key={bunny.id} type="button" disabled={busy || !isController} onClick={() => onChoose(bunny.id)}><GameCard card={bunny} compact /></button>)}</div></div></section></div>;
}

function CheckCircleIcon() {
  return <span aria-hidden="true">✓</span>;
}

function gameHasDefense(player) {
  return getKillerBunniesDefenseUnits(player) > 0;
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

function KaballasMarketCard({ market, prices, couponActive }) {
  return <article className={`kb-market-card ${market.isOpen ? "open" : "closed"}`} aria-label={`Kaballa’s Market is ${market.isOpen ? "open" : "closed"}`}>
    <span className="kb-market-card-type">STARTER CARD</span>
    <div className="kb-market-card-title"><Store /><span><strong>Kaballa’s</strong><b>MARKET</b></span></div>
    <div className="kb-market-sign">{market.isOpen ? "OPEN" : "CLOSED"}</div>
    <p>{market.isOpen ? couponActive ? "Half Price Coupon active for you this turn" : "Current prices for supplies" : "No purchases until a market card reopens the store"}</p>
    <div className="kb-price-board">
      <span><Leaf /><b>Cabbage</b><strong>{prices.cabbage}</strong></span>
      <span><Droplets /><b>Water</b><strong>{prices.water}</strong></span>
      <span><Carrot /><b>Carrot</b><strong>{prices.carrot}</strong></span>
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
  const modifierCount = bunny.modifiers?.length || 0;
  const cloverReduction = getKillerBunniesCloverReduction(bunny);
  return <span className={`kb-mini-bunny bunny-${bunny.color || "neutral"}`} title={`${bunny.name}${modifierCount ? ` · ${modifierCount} modifier${modifierCount === 1 ? "" : "s"}` : ""}${cloverReduction ? ` · Clover −${cloverReduction}` : ""}${bunny.bounty ? ` · ${bunny.bounty.amount} Dolla bounty` : ""}`}><Rabbit /><small>{bunny.name?.replace(" Bunny", "")}</small>{bunny.bounty && <i>${bunny.bounty.amount}</i>}{modifierCount > 0 && <i>{cloverReduction ? `♣−${cloverReduction}` : `+${modifierCount}`}</i>}</span>;
}

function GameCard({ card, compact = false, className = "" }) {
  if (card.hidden) return <div className={`kb-playing-card hidden ${compact ? "compact" : ""} ${className}`}><Rabbit /><b>HIDDEN RUN</b></div>;
  const icon = { bunny: <Rabbit />, weapon: <Target />, chooseCarrot: <Carrot />, feed: <Leaf />, everyoneFeed: <Leaf />, defense: <Shield />, money: <Coins />, modifier: <Sparkles />, special: <Sparkles />, verySpecial: <Sparkles />, market: <Store />, shopMarket: <Store /> }[card.kind] || <Rabbit />;
  return <div className={`kb-playing-card kind-${card.kind} color-${card.color || "cream"} ${compact ? "compact" : ""} ${className}`} title={(card.requirements || []).join(" ")}><span className="kb-card-type">{card.type}{card.catalogNumber ? ` · #${card.catalogNumber}` : ""}</span><div className="kb-card-icon">{icon}</div><strong>{card.name}</strong>{!compact && <p>{card.ability || card.detail}</p>}{!compact && card.requiresBunny && <small className="kb-card-needs-bunny"><Rabbit /> BUNNY REQUIRED</small>}{card.power && <b className="kb-card-stat">≤ {card.power}</b>}</div>;
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return <div className="kb-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="kb-rules" role="dialog" aria-modal="true" aria-labelledby="kb-rules-title"><button className="kb-modal-close" type="button" onClick={onClose} aria-label="Close rules"><X /></button><span className="kb-kicker"><BookOpen size={15} /> Digital edition rules</span><h2 id="kb-rules-title">Plan two cards ahead.</h2><div className="kb-rule-steps"><article><b>1</b><div><strong>Resolve immediate cards</strong><p>A PLAY IMMEDIATELY card is revealed when drawn, never enters your hand, and must finish its action before you draw a replacement or program a RUN.</p></div></article><article><b>2</b><div><strong>Program your opening</strong><p>Each player starts with seven playable cards. Pick the TOP RUN card that plays first, then the BOTTOM RUN card that follows it. The hunt begins after everyone confirms both choices.</p></div></article><article><b>3</b><div><strong>Use Bunny Triplets</strong><p>Three matching bunnies, two matching bunnies with their Pawn, or a specified Super or grouped bunny can unlock two RUN plays. Draw and replace after the first RUN; the game rechecks the qualification before allowing the second.</p></div></article><article><b>4</b><div><strong>Attach Bunny Modifiers</strong><p>Place a modifier under any bunny at the table, including an opponent’s. Modifiers cannot move, multiples may share a bunny, and all leave with that bunny. Lucky Clovers stack to lower incoming Weapon die-roll levels.</p></div></article><article><b>5</b><div><strong>Shop and feed</strong><p>Kaballa’s sells food and carrots. A Feed the Bunny card stays on its target until the end of that bunny owner’s turn, so they may buy missing Cabbage and Water before flipping TOP RUN.</p></div></article><article><b>6</b><div><strong>Save special cards</strong><p>A SPECIAL or VERY SPECIAL may be saved only after it completes the BOTTOM RUN → TOP RUN cycle. Saved cards stay face-up and may be played later without replacing the normal TOP RUN play.</p></div></article><article><b>7</b><div><strong>Find the Magic Carrot</strong><p>When every market carrot is gone, click the hidden Magic Carrot pile. You must still have a living bunny and own the matching carrot to win.</p></div></article></div><div className="kb-pile-guide"><span><Layers3 /> Main: after TOP RUN</span><span><Leaf /> Cabbage: current market price</span><span><Droplets /> Water: current market price</span><span><Carrot /> Carrots: current market price</span><span><Sparkles /> Magic: at game end</span></div><p className="kb-disclaimer">Choose A Carrot effects may take a carrot even while the market is closed. Booster names follow the official Quest order; their digital card text and artwork are original to this prototype.</p></section></div>;
}
