'use client';

import React from 'react';
import {
  Car,
  Castle,
  Cat,
  Check,
  Circle,
  CircleDot,
  Club,
  Copy,
  Crown,
  Dice5,
  Dog,
  DoorOpen,
  Footprints,
  Gem,
  Goal,
  Home,
  Plane,
  Play,
  RefreshCcw,
  Rocket,
  Sailboat,
  TrainFront,
  Trophy,
  Users,
  Volleyball,
  type LucideIcon
} from 'lucide-react';
import { board, cornerIds } from './board';
import {
  acknowledgeCard,
  acknowledgeRent,
  addLocalPlayer,
  acceptTrade,
  bidAuction,
  buyPendingProperty,
  buyImprovement,
  completeAuctionPurchase,
  declineTrade,
  declinePendingProperty,
  finishDebtPayment,
  joinPlayer,
  makeId,
  makeInitialState,
  mortgageProperty,
  payForcedJailExit,
  payToLeaveJail,
  payFlatIncomeTax,
  payPercentIncomeTax,
  passAuction,
  playerPieces,
  proposeTrade,
  rollDice,
  rollUtilityRent,
  sellImprovement,
  stayInJailAndRoll,
  startGame,
  unmortgageProperty,
  useCardForForcedJailExit,
  useGetOutOfJailFree
} from './game';
import { isOnlineSyncEnabled, RoomService } from './roomService';
import { GameState, Player, PlayerColor, PlayerPiece, Space } from './types';
const storagePlayerId = 'monopoly-player-id';
const storagePlayerName = 'monopoly-player-name';
const storagePlayerPiece = 'monopoly-player-piece';

const canUseBrowser = () => typeof window !== 'undefined';

const getPlayerId = () => {
  if (!canUseBrowser()) return '';
  const existing = localStorage.getItem(storagePlayerId);
  if (existing) return existing;
  const id = makeId();
  localStorage.setItem(storagePlayerId, id);
  return id;
};

const getStoredName = () => (canUseBrowser() ? localStorage.getItem(storagePlayerName) || '' : '');
const getInitialRoomCode = () => (canUseBrowser() ? new URLSearchParams(window.location.search).get('room') || '' : '');

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const [playerId, setPlayerId] = React.useState('');
  const [name, setName] = React.useState('');
  const [selectedPiece, setSelectedPiece] = React.useState<PlayerPiece>('car');
  const [joinCode, setJoinCode] = React.useState('');
  const [game, setGame] = React.useState<GameState | null>(null);
  const [error, setError] = React.useState('');
  const [isRolling, setIsRolling] = React.useState(false);
  const latestGame = React.useRef<GameState | null>(null);

  React.useEffect(() => {
    setPlayerId(getPlayerId());
    setName(getStoredName());
    setSelectedPiece(getStoredPiece());
    setJoinCode(getInitialRoomCode());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    latestGame.current = game;
  }, [game]);

  React.useEffect(() => {
    if (!game?.roomCode) return;
    return RoomService.subscribe(game.roomCode, (remote) => {
      setGame((current) => (!current || remote.updatedAt >= current.updatedAt ? remote : current));
    });
  }, [game?.roomCode]);

  const persist = async (next: GameState) => {
    setGame(next);
    latestGame.current = next;
    await RoomService.save(next);
    if (canUseBrowser()) window.history.replaceState(null, '', `?room=${next.roomCode}`);
  };

  const useName = () => {
    const clean = name.trim() || 'Player';
    if (canUseBrowser()) {
      localStorage.setItem(storagePlayerName, clean);
      localStorage.setItem(storagePlayerPiece, selectedPiece);
    }
    setName(clean);
    return clean;
  };

  const createRoom = async () => {
    setError('');
    const next = makeInitialState(playerId, useName(), undefined, selectedPiece);
    await persist(next);
  };

  const joinRoom = async () => {
    setError('');
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Enter a room code first.');
      return;
    }
    const existing = await RoomService.load(code);
    if (!existing) {
      setError(
        isOnlineSyncEnabled
          ? `Room ${code} was not found.`
          : `Room ${code} was not found on this dev server. Create and join from http://localhost:5175/, or add Supabase env vars for true online rooms.`
      );
      return;
    }
    if (existing.players.some((player) => getPlayerPiece(player) === selectedPiece)) {
      setError(`${pieceLabel(selectedPiece)} is already taken in room ${code}. Choose a different piece.`);
      return;
    }
    let joiningPlayerId = playerId;
    if (existing.players.some((player) => player.id === playerId)) {
      joiningPlayerId = makeId();
      if (canUseBrowser()) localStorage.setItem(storagePlayerId, joiningPlayerId);
      setPlayerId(joiningPlayerId);
    }

    const next = joinPlayer(existing, joiningPlayerId, useName(), selectedPiece);
    await persist(next);
  };

  const updateGame = async (updater: (state: GameState) => GameState) => {
    if (!latestGame.current) return;
    await persist(updater(latestGame.current));
  };

  const activePlayer = game?.players[game.currentPlayerIndex];
  const me = game?.players.find((player) => player.id === playerId);
  const isHost = game?.hostId === playerId;
  const isMyTurn = activePlayer?.id === playerId;
  const canControlTurn = isMyTurn || Boolean(isHost && activePlayer?.id.startsWith('local-'));
  const canAcknowledgeCard =
    Boolean(game?.pendingCard?.playerId === playerId) || Boolean(isHost && game?.pendingCard?.playerId.startsWith('local-'));
  const canAcknowledgeRent =
    Boolean(game?.pendingRent?.payerId === playerId) || Boolean(isHost && game?.pendingRent?.payerId.startsWith('local-'));
  const canRollUtilityRent =
    Boolean(game?.pendingUtilityRent?.payerId === playerId) || Boolean(isHost && game?.pendingUtilityRent?.payerId.startsWith('local-'));
  const pendingDebtPlayer = game?.players.find((player) => player.id === game.pendingDebt?.playerId);
  const canFinishDebt =
    Boolean(game?.pendingDebt?.playerId === playerId) || Boolean(isHost && game?.pendingDebt?.playerId.startsWith('local-'));
  const canRespondTrade =
    Boolean(game?.pendingTrade?.toPlayerId === playerId) || Boolean(isHost && game?.pendingTrade?.toPlayerId.startsWith('local-'));
  const canAnswerPurchase =
    Boolean(game?.pendingPurchase?.playerId === playerId) || Boolean(isHost && game?.pendingPurchase?.playerId.startsWith('local-'));
  const canAnswerTax = Boolean(game?.pendingTax?.playerId === playerId) || Boolean(isHost && game?.pendingTax?.playerId.startsWith('local-'));
  const auctionActivePlayer = game?.players.find((player) => player.id === game.pendingAuction?.activePlayerId);
  const canActInAuction =
    Boolean(game?.pendingAuction?.activePlayerId === playerId) || Boolean(isHost && auctionActivePlayer?.id.startsWith('local-'));
  const canChooseJail = Boolean(activePlayer?.id === playerId) || Boolean(isHost && activePlayer?.id.startsWith('local-'));
  const needsJailChoice = Boolean(activePlayer?.inJail && !game?.jailRollMode);
  const pendingJailExitPlayer = game?.players.find((player) => player.id === game.pendingJailExit?.playerId);
  const canResolveJailExit =
    Boolean(game?.pendingJailExit?.playerId === playerId) || Boolean(isHost && pendingJailExitPlayer?.id.startsWith('local-'));

  const handleRoll = () => {
    if (
      !game ||
      isRolling ||
      game.phase !== 'playing' ||
      game.pendingCard ||
      game.pendingPurchase ||
      game.pendingTax ||
      game.pendingRent ||
      game.pendingUtilityRent ||
      game.pendingDebt ||
      game.pendingAuction ||
      game.pendingJailExit ||
      game.pendingTrade
    ) return;
    setIsRolling(true);
    window.setTimeout(() => {
      void updateGame(rollDice).finally(() => setIsRolling(false));
    }, 1100);
  };

  if (!isReady) {
    return (
      <div className="monopoly-page">
        <main className="entry-shell">
          <section className="entry-panel">
            <div className="brand-row">
              <div className="brand-mark">M</div>
              <div>
                <h1>Monopoly Online</h1>
                <p>Loading game room...</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="monopoly-page">
      <main className="entry-shell">
        <section className="entry-panel">
          <div className="brand-row">
            <div className="brand-mark">M</div>
            <div>
              <h1>Monopoly Online</h1>
              <p>{isOnlineSyncEnabled ? 'Supabase sync is enabled.' : 'Local room sync until Supabase env vars are added.'}</p>
            </div>
          </div>

          <label>
            Player name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rich Uncle Pennybags" />
          </label>

          <PiecePicker selectedPiece={selectedPiece} onSelect={setSelectedPiece} />

          <div className="entry-actions">
            <button className="primary" onClick={createRoom}>
              <Play size={18} /> Create room
            </button>
          </div>

          <div className="join-row">
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" />
            <button onClick={joinRoom}>
              <DoorOpen size={18} /> Join
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </section>
      </main>
      </div>
    );
  }

  return (
    <div className="monopoly-page">
    <main className="game-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Room</span>
          <button className="room-code" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${game.roomCode}`)}>
            {game.roomCode} <Copy size={15} />
          </button>
        </div>
        <div className="sync-pill">{isOnlineSyncEnabled ? 'Supabase online' : 'Local sync'}</div>
      </header>

      <section className="layout">
        <Board game={game} />

        <aside className="sidebar">
          <section className="turn-panel">
            <div className="turn-heading">
              <div>
                <span className="eyebrow">Turn</span>
                <h2>{activePlayer?.name ?? 'Waiting'}</h2>
              </div>
              {isHost && <Crown className="host-icon" size={22} />}
            </div>

            <DiceTray roll={game.lastRoll} rolling={isRolling} />

            {game.pendingCard && <DrawnCardPanel game={game} />}
            {game.pendingPurchase && <PurchasePanel game={game} />}
            {game.pendingTax && <TaxPanel game={game} />}
            {game.pendingUtilityRent && <UtilityRentPanel game={game} />}
            {game.pendingRent && <RentPanel game={game} />}
            {game.pendingDebt && <DebtPanel game={game} />}
            {game.pendingAuction && <AuctionPanel game={game} />}
            {game.pendingJailExit && <ForcedJailExitPanel game={game} />}
            {game.pendingTrade && <TradeOfferPanel game={game} />}
            {needsJailChoice && <JailPanel player={activePlayer} />}

            {game.phase === 'lobby' ? (
              <div className="lobby-actions">
                <button onClick={() => updateGame(addLocalPlayer)}>
                  <Users size={18} /> Add player
                </button>
                <button className="primary full" disabled={!isHost || game.players.length < 2} onClick={() => updateGame(startGame)}>
                  <Play size={18} /> Start game
                </button>
              </div>
            ) : game.pendingCard ? (
              <button className="primary full" disabled={!canAcknowledgeCard || game.phase === 'gameOver'} onClick={() => updateGame(acknowledgeCard)}>
                <Check size={18} /> Acknowledge card
              </button>
            ) : game.pendingPurchase ? (
              <div className="decision-actions">
                <button className="primary full" disabled={!canAnswerPurchase || game.phase === 'gameOver'} onClick={() => updateGame(buyPendingProperty)}>
                  Buy
                </button>
                <button className="full" disabled={!canAnswerPurchase || game.phase === 'gameOver'} onClick={() => updateGame(declinePendingProperty)}>
                  Auction
                </button>
              </div>
            ) : game.pendingTax ? (
              game.pendingTax.flatAmount === 75 ? (
                <button className="primary full" disabled={!canAnswerTax || game.phase === 'gameOver'} onClick={() => updateGame(payFlatIncomeTax)}>
                  Pay $75
                </button>
              ) : (
                <div className="decision-actions">
                  <button className="primary full" disabled={!canAnswerTax || game.phase === 'gameOver'} onClick={() => updateGame(payPercentIncomeTax)}>
                    Pay 10%
                  </button>
                  <button className="full" disabled={!canAnswerTax || game.phase === 'gameOver'} onClick={() => updateGame(payFlatIncomeTax)}>
                    Pay ${game.pendingTax.flatAmount}
                  </button>
                </div>
              )
            ) : game.pendingUtilityRent ? (
              <button className="primary full" disabled={!canRollUtilityRent || game.phase === 'gameOver'} onClick={() => updateGame(rollUtilityRent)}>
                Roll utility rent
              </button>
            ) : game.pendingDebt ? (
              <button
                className="primary full"
                disabled={!canFinishDebt || !pendingDebtPlayer || pendingDebtPlayer.money < game.pendingDebt.amountOwed || game.phase === 'gameOver'}
                onClick={() => updateGame(finishDebtPayment)}
              >
                Finish payment
              </button>
            ) : game.pendingRent ? (
              <button className="primary full" disabled={!canAcknowledgeRent || game.phase === 'gameOver'} onClick={() => updateGame(acknowledgeRent)}>
                <Check size={18} /> Acknowledge rent
              </button>
            ) : game.pendingTrade ? (
              <div className="decision-actions">
                <button className="primary full" disabled={!canRespondTrade || game.phase === 'gameOver'} onClick={() => updateGame(acceptTrade)}>
                  Accept trade
                </button>
                <button className="full" disabled={!canRespondTrade || game.phase === 'gameOver'} onClick={() => updateGame(declineTrade)}>
                  Decline trade
                </button>
              </div>
            ) : game.pendingAuction ? (
              <div className="decision-actions">
                {game.pendingAuction.highBidderId === game.pendingAuction.activePlayerId && (
                  <button className="primary full" disabled={!canActInAuction || game.phase === 'gameOver'} onClick={() => updateGame(completeAuctionPurchase)}>
                    Complete purchase
                  </button>
                )}
                <button className="primary full" disabled={!canActInAuction || game.phase === 'gameOver'} onClick={() => updateGame(bidAuction)}>
                  Bid $10
                </button>
                <button className="full" disabled={!canActInAuction || game.phase === 'gameOver'} onClick={() => updateGame(passAuction)}>
                  Pass
                </button>
              </div>
            ) : game.pendingJailExit ? (
              <div className="decision-actions">
                <button className="primary full" disabled={!canResolveJailExit || game.phase === 'gameOver'} onClick={() => updateGame(payForcedJailExit)}>
                  Pay $50
                </button>
                <button
                  className="full"
                  disabled={!canResolveJailExit || !pendingJailExitPlayer || pendingJailExitPlayer.getOutOfJailFreeCards <= 0}
                  onClick={() => updateGame(useCardForForcedJailExit)}
                >
                  Use Card
                </button>
              </div>
            ) : needsJailChoice ? (
              <div className="jail-actions">
                <button className="primary full" disabled={!canChooseJail || !activePlayer || activePlayer.money < 50} onClick={() => updateGame(payToLeaveJail)}>
                  Pay $50
                </button>
                <button
                  className="full"
                  disabled={!canChooseJail || !activePlayer || activePlayer.getOutOfJailFreeCards <= 0}
                  onClick={() => updateGame(useGetOutOfJailFree)}
                >
                  Use Card
                </button>
                <button className="full" disabled={!canChooseJail} onClick={() => updateGame(stayInJailAndRoll)}>
                  Stay & Roll
                </button>
              </div>
            ) : (
              <button className="primary full" disabled={!canControlTurn || isRolling || game.phase === 'gameOver'} onClick={handleRoll}>
                {isRolling ? <RefreshCcw size={18} /> : <Dice5 size={18} />} Roll dice
              </button>
            )}

            <p className="hint">
              {game.phase === 'lobby'
                ? isHost
                  ? 'Share the room link, then start when everyone is in.'
                  : 'Waiting for the host to start.'
                : game.pendingCard
                  ? 'Waiting for the card to be acknowledged.'
                  : game.pendingPurchase
                    ? 'Waiting for the property decision.'
                    : game.pendingTax
                      ? 'Waiting for the Income Tax choice.'
                    : game.pendingRent
                      ? 'Waiting for rent to be acknowledged.'
                      : game.pendingUtilityRent
                        ? 'Waiting for utility rent roll.'
                        : game.pendingDebt
                          ? 'Waiting for the debt to be paid.'
                          : game.pendingTrade
                            ? 'Waiting for the trade response.'
                        : game.pendingAuction
                          ? `Auction turn: ${auctionActivePlayer?.name ?? 'Player'}.`
                        : game.pendingJailExit
                          ? 'Third Jail roll failed. Pay or use a card to move.'
                        : needsJailChoice
                          ? 'Choose how to handle Jail before rolling.'
                  : isMyTurn
                    ? 'Your move. The board updates after the dice settle.'
                    : `Waiting for ${activePlayer?.name}.`}
            </p>
          </section>

          <section className="players-panel">
            <h3>Players</h3>
            {game.players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                active={player.id === activePlayer?.id}
                me={player.id === me?.id}
                canManage={player.id === playerId || Boolean(isHost && player.id.startsWith('local-'))}
                game={game}
                onMortgage={(spaceId) => updateGame((state) => mortgageProperty(state, player.id, spaceId))}
                onUnmortgage={(spaceId) => updateGame((state) => unmortgageProperty(state, player.id, spaceId))}
                onBuild={(spaceId) => updateGame((state) => buyImprovement(state, player.id, spaceId))}
                onSellImprovement={(spaceId) => updateGame((state) => sellImprovement(state, player.id, spaceId))}
                onProposeTrade={(toPlayerId, offeredPropertyIds, requestedPropertyIds, offeredMoney, requestedMoney, offeredJailCards, requestedJailCards) =>
                  updateGame((state) =>
                    proposeTrade(state, player.id, toPlayerId, offeredPropertyIds, requestedPropertyIds, offeredMoney, requestedMoney, offeredJailCards, requestedJailCards)
                  )
                }
              />
            ))}
          </section>

          <section className="log-panel">
            <h3>Game log</h3>
            <div className="log-list">
              {game.log.map((entry) => (
                <p key={entry.id}>{entry.text}</p>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
    </div>
  );
}

function DrawnCardPanel({ game }: { game: GameState }) {
  const card = game.pendingCard;
  if (!card) return null;
  const player = game.players.find((candidate) => candidate.id === card.playerId);
  const deckLabel = card.deck === 'chance' ? 'Chance' : 'Community Chest';

  return (
    <section className={`draw-card ${card.deck}`} aria-label={`${deckLabel} card`}>
      <div className="draw-card-header">
        <span>{deckLabel}</span>
        <strong>{player?.name ?? 'Player'} drew</strong>
      </div>
      <h3>{card.title}</h3>
      <p>{card.text}</p>
      <div className="card-action">{card.actionText}</div>
    </section>
  );
}

function PurchasePanel({ game }: { game: GameState }) {
  const pending = game.pendingPurchase;
  if (!pending) return null;
  const space = board[pending.spaceId];
  const player = game.players.find((candidate) => candidate.id === pending.playerId);
  const shortfall = Math.max(0, (space.price ?? 0) - (player?.money ?? 0));

  return (
    <section className="decision-panel purchase-panel">
      <span className="panel-label">Unowned property</span>
      <h3>{space.name}</h3>
      <p>
        {shortfall > 0
          ? `${player?.name ?? 'Player'} needs $${shortfall} more. Mortgage property or sell houses/hotels to the bank, then click Buy again.`
          : `${player?.name ?? 'Player'} may buy this deed or send it to auction.`}
      </p>
      <div className="deed-summary">
        <span>Price</span>
        <strong>${space.price}</strong>
      </div>
      <div className="deed-summary">
        <span>Rent</span>
        <strong>${space.rent ?? 10}</strong>
      </div>
    </section>
  );
}

function TaxPanel({ game }: { game: GameState }) {
  const pending = game.pendingTax;
  if (!pending) return null;
  const isFixedOnly = pending.flatAmount === 75;
  const player = game.players.find((candidate) => candidate.id === pending.playerId);
  const propertyValue =
    player?.properties.reduce((total, spaceId) => {
      const space = board[spaceId];
      return total + (space?.price ?? 0);
    }, 0) ?? 0;
  const cash = player?.money ?? 0;

  return (
    <section className="decision-panel tax-panel">
      <span className="panel-label">{isFixedOnly ? 'Luxury Tax' : 'Income Tax'}</span>
      <h3>{isFixedOnly ? 'Pay Luxury Tax' : 'Choose how to pay'}</h3>
      <p>
        {isFixedOnly
          ? `${player?.name ?? 'Player'} must pay the fixed Luxury Tax.`
          : `${player?.name ?? 'Player'} may pay 10% of cash plus owned property value, or pay a flat $200.`}
      </p>
      {!isFixedOnly && (
        <div className="deed-summary">
          <span>10% option</span>
          <strong>${pending.percentAmount}</strong>
        </div>
      )}
      <div className="deed-summary">
        <span>Flat option</span>
        <strong>${pending.flatAmount}</strong>
      </div>
      <small className="tax-note">
        Cash ${cash} + deeds ${propertyValue}
      </small>
    </section>
  );
}

function RentPanel({ game }: { game: GameState }) {
  const pending = game.pendingRent;
  if (!pending) return null;
  const space = board[pending.spaceId];
  const payer = game.players.find((candidate) => candidate.id === pending.payerId);
  const owner = game.players.find((candidate) => candidate.id === pending.ownerId);

  return (
    <section className="decision-panel rent-panel">
      <span className="panel-label">Rent</span>
      <h3>{space.name}</h3>
      <p>
        {pending.isMortgaged
          ? `${payer?.name ?? 'Player'} landed on ${owner?.name ?? 'Player'}'s mortgaged property. No rent is due.`
          : `${payer?.name ?? 'Player'} paid ${owner?.name ?? 'Player'} $${pending.amount} rent.`}
      </p>
      <div className="deed-summary">
        <span>{pending.isMortgaged ? 'Amount due' : 'Rent paid'}</span>
        <strong>${pending.amount}</strong>
      </div>
      {pending.rentNote && <small className="tax-note">{pending.rentNote}</small>}
    </section>
  );
}

function DebtPanel({ game }: { game: GameState }) {
  const debt = game.pendingDebt;
  if (!debt) return null;
  const player = game.players.find((candidate) => candidate.id === debt.playerId);
  const creditor = debt.creditorId ? game.players.find((candidate) => candidate.id === debt.creditorId) : null;
  const cash = player?.money ?? 0;
  const shortfall = Math.max(0, debt.amountOwed - cash);

  return (
    <section className="decision-panel debt-panel">
      <span className="panel-label">Payment Due</span>
      <h3>{player?.name ?? 'Player'} owes ${debt.amountOwed}</h3>
      <p>
        Mortgage property or sell houses/hotels to the bank until there is enough cash, then finish the payment
        {creditor ? ` to ${creditor.name}` : ''}.
      </p>
      <div className="deed-summary">
        <span>Cash now</span>
        <strong>${cash}</strong>
      </div>
      <div className="deed-summary">
        <span>Still needed</span>
        <strong>${shortfall}</strong>
      </div>
      <small className="tax-note">{debt.reason}</small>
    </section>
  );
}

function UtilityRentPanel({ game }: { game: GameState }) {
  const pending = game.pendingUtilityRent;
  if (!pending) return null;
  const space = board[pending.spaceId];
  const payer = game.players.find((candidate) => candidate.id === pending.payerId);
  const owner = game.players.find((candidate) => candidate.id === pending.ownerId);

  return (
    <section className="decision-panel rent-panel">
      <span className="panel-label">Utility Rent</span>
      <h3>{space.name}</h3>
      <p>{payer?.name ?? 'Player'} landed on {owner?.name ?? 'Player'}'s utility. Roll two dice and pay {pending.multiplier} times the total.</p>
      <div className="deed-summary">
        <span>Multiplier</span>
        <strong>{pending.multiplier}x</strong>
      </div>
    </section>
  );
}

function TradeOfferPanel({ game }: { game: GameState }) {
  const trade = game.pendingTrade;
  if (!trade) return null;
  const fromPlayer = game.players.find((player) => player.id === trade.fromPlayerId);
  const toPlayer = game.players.find((player) => player.id === trade.toPlayerId);

  return (
    <section className="decision-panel trade-panel">
      <span className="panel-label">Trade Offer</span>
      <h3>{fromPlayer?.name ?? 'Player'} to {toPlayer?.name ?? 'Player'}</h3>
      <p>{toPlayer?.name ?? 'Player'} may accept or decline this property trade.</p>
      <TradePropertyList
        title={`${fromPlayer?.name ?? 'Player'} gives`}
        propertyIds={trade.offeredPropertyIds}
        money={trade.offeredMoney ?? 0}
        jailCards={trade.offeredJailCards ?? 0}
      />
      <TradePropertyList
        title={`${toPlayer?.name ?? 'Player'} gives`}
        propertyIds={trade.requestedPropertyIds}
        money={trade.requestedMoney ?? 0}
        jailCards={trade.requestedJailCards ?? 0}
      />
    </section>
  );
}

function TradePropertyList({ title, propertyIds, money, jailCards }: { title: string; propertyIds: number[]; money: number; jailCards: number }) {
  const propertyText = propertyIds.length ? propertyIds.map((spaceId) => board[spaceId]?.name).join(', ') : '';
  const moneyText = money > 0 ? `$${money}` : '';
  const jailText = jailCards > 0 ? `${jailCards} Get Out of Jail Free card${jailCards === 1 ? '' : 's'}` : '';
  const summary = [propertyText, moneyText, jailText].filter(Boolean).join(' + ') || 'Nothing';
  return (
    <div className="trade-summary-list">
      <span>{title}</span>
      <strong>{summary}</strong>
    </div>
  );
}

function JailPanel({ player }: { player?: Player }) {
  if (!player) return null;
  const turnNumber = Math.min(player.jailTurnCount + 1, 3);
  return (
    <section className="decision-panel jail-panel">
      <span className="panel-label">Jail</span>
      <h3>{player.name} is in Jail</h3>
      <p>Turn {turnNumber} of 3. Pay $50 or use a Get Out of Jail Free card before rolling, or stay in Jail and roll for doubles.</p>
      <div className="deed-summary">
        <span>Cards</span>
        <strong>{player.getOutOfJailFreeCards}</strong>
      </div>
      <small className="tax-note">If staying, doubles gets you out but does not grant another roll.</small>
    </section>
  );
}

function ForcedJailExitPanel({ game }: { game: GameState }) {
  const pending = game.pendingJailExit;
  if (!pending) return null;
  const player = game.players.find((candidate) => candidate.id === pending.playerId);
  const total = pending.dieOne + pending.dieTwo;

  return (
    <section className="decision-panel jail-panel">
      <span className="panel-label">Third Jail Turn</span>
      <h3>{player?.name ?? 'Player'} must leave Jail</h3>
      <p>The roll was {pending.dieOne} + {pending.dieTwo}. Pay $50 or use a Get Out of Jail Free card, then move {total} spaces.</p>
      <div className="deed-summary">
        <span>Move</span>
        <strong>{total} spaces</strong>
      </div>
      <div className="deed-summary">
        <span>Cards</span>
        <strong>{player?.getOutOfJailFreeCards ?? 0}</strong>
      </div>
    </section>
  );
}

function AuctionPanel({ game }: { game: GameState }) {
  const auction = game.pendingAuction;
  if (!auction) return null;
  const space = board[auction.spaceId];
  const activeBidder = game.players.find((player) => player.id === auction.activePlayerId);
  const highBidder = game.players.find((player) => player.id === auction.highBidderId);

  return (
    <section className="decision-panel auction-panel">
      <span className="panel-label">Auction</span>
      <h3>{space.name}</h3>
      <p>{activeBidder?.name ?? 'Player'} may bid or pass.</p>
      <div className="deed-summary">
        <span>Current bid</span>
        <strong>${auction.currentBid}</strong>
      </div>
      <div className="deed-summary">
        <span>High bidder</span>
        <strong>{highBidder?.name ?? 'None'}</strong>
      </div>
    </section>
  );
}

function Board({ game }: { game: GameState }) {
  return (
    <section className="board" aria-label="Monopoly board">
      {board.map((space) => (
        <BoardSpace
          key={space.id}
          space={space}
          players={game.players.filter((player) => player.position === space.id && !player.bankrupt)}
          improvementLevel={game.improvements[space.id] ?? 0}
        />
      ))}
      <div className="board-center">
        <span>Monopoly</span>
        <p>Buy deeds, start auctions, collect rent, dodge taxes, and keep rolling.</p>
      </div>
    </section>
  );
}

function BoardSpace({ space, players, improvementLevel }: { space: Space; players: Player[]; improvementLevel: number }) {
  const style = getGridPosition(space.id);
  return (
    <div className={`space ${cornerIds.has(space.id) ? 'corner' : ''} ${getBoardSide(space.id)} ${space.kind}-space`} style={style}>
      {space.color && (
        <div className="color-band" style={{ backgroundColor: space.color }}>
          {improvementLevel > 0 && <span className={`improvement-marker ${improvementLevel >= 5 ? 'hotel' : 'house'}`}>{improvementLevel >= 5 ? 'H' : improvementLevel}</span>}
        </div>
      )}
      {space.kind === 'jail' && <div className="jail-window" aria-hidden="true"><span /><span /><span /></div>}
      {(space.kind === 'chance' || space.kind === 'community') && <SpecialSpaceArt kind={space.kind} />}
      <span className="space-name">{space.name}</span>
      {space.price && <span className="space-price">${space.price}</span>}
      {space.kind === 'tax' && <span className="space-price">{getTaxText(space)}</span>}
      <div className="tokens">
        {players.map((player) => (
          <PlayerToken key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}

function SpecialSpaceArt({ kind }: { kind: 'chance' | 'community' }) {
  return (
    <div className={`special-art ${kind}`} aria-hidden="true">
      {kind === 'chance' ? '?' : 'CC'}
    </div>
  );
}

function getTaxText(space: Space) {
  if (space.name === 'Income Tax') return '$200 or 10%';
  if (space.name === 'Luxury Tax') return '$75';
  return '$75';
}

function getBoardSide(id: number) {
  if (id > 0 && id < 10) return 'bottom-side';
  if (id > 10 && id < 20) return 'left-side';
  if (id > 20 && id < 30) return 'top-side';
  if (id > 30 && id < 40) return 'right-side';
  return '';
}

function getGridPosition(id: number): React.CSSProperties {
  if (id <= 10) return { gridColumn: 11 - id, gridRow: 11 };
  if (id <= 20) return { gridColumn: 1, gridRow: 21 - id };
  if (id <= 30) return { gridColumn: id - 19, gridRow: 1 };
  return { gridColumn: 11, gridRow: id - 29 };
}

function DiceTray({ roll, rolling }: { roll: GameState['lastRoll']; rolling: boolean }) {
  const dieOne = rolling ? 6 : roll?.dieOne ?? 1;
  const dieTwo = rolling ? 5 : roll?.dieTwo ?? 1;
  return (
    <div className="dice-tray">
      <Die value={dieOne} rolling={rolling} />
      <Die value={dieTwo} rolling={rolling} delay />
    </div>
  );
}

function Die({ value, rolling, delay = false }: { value: number; rolling: boolean; delay?: boolean }) {
  return (
    <div className={`die value-${value} ${rolling ? 'rolling' : ''} ${delay ? 'delay' : ''}`} aria-label={`Die showing ${value}`}>
      <div className="die-shadow" />
      <div className="die-cube">
        {[1, 2, 3, 4, 5, 6].map((faceValue) => (
          <div key={faceValue} className={`die-face face-${faceValue}`}>
            {Array.from({ length: 9 }, (_, index) => (
              <span key={index} className={pipVisible(faceValue, index) ? 'pip visible' : 'pip'} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function pipVisible(value: number, index: number) {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  return pips[value].includes(index);
}

function PiecePicker({ selectedPiece, onSelect }: { selectedPiece: PlayerPiece; onSelect: (piece: PlayerPiece) => void }) {
  return (
    <fieldset className="piece-picker">
      <legend>Player piece</legend>
      <div className="piece-options">
        {playerPieces.map((piece) => {
          const Icon = pieceIcons[piece];
          return (
            <button
              key={piece}
              type="button"
              className={piece === selectedPiece ? 'selected' : ''}
              aria-pressed={piece === selectedPiece}
              onClick={() => onSelect(piece)}
            >
              <Icon size={18} strokeWidth={2.6} />
              <span>{pieceLabel(piece)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PlayerRow({
  player,
  active,
  me,
  canManage,
  game,
  onMortgage,
  onUnmortgage,
  onBuild,
  onSellImprovement,
  onProposeTrade
}: {
  player: Player;
  active: boolean;
  me: boolean;
  canManage: boolean;
  game: GameState;
  onMortgage: (spaceId: number) => void;
  onUnmortgage: (spaceId: number) => void;
  onBuild: (spaceId: number) => void;
  onSellImprovement: (spaceId: number) => void;
  onProposeTrade: (
    toPlayerId: string,
    offeredPropertyIds: number[],
    requestedPropertyIds: number[],
    offeredMoney: number,
    requestedMoney: number,
    offeredJailCards: number,
    requestedJailCards: number
  ) => void;
}) {
  const [tradeTargetId, setTradeTargetId] = React.useState('');
  const [offeredPropertyIds, setOfferedPropertyIds] = React.useState<number[]>([]);
  const [requestedPropertyIds, setRequestedPropertyIds] = React.useState<number[]>([]);
  const [offeredMoney, setOfferedMoney] = React.useState(0);
  const [requestedMoney, setRequestedMoney] = React.useState(0);
  const [offeredJailCards, setOfferedJailCards] = React.useState(0);
  const [requestedJailCards, setRequestedJailCards] = React.useState(0);
  const tradeTargets = game.players.filter((candidate) => candidate.id !== player.id && !candidate.bankrupt);
  const selectedTradeTarget = game.players.find((candidate) => candidate.id === tradeTargetId) ?? tradeTargets[0];
  const canOpenTrade = canManage && game.phase !== 'gameOver' && !game.pendingTrade && tradeTargets.length > 0;

  React.useEffect(() => {
    if (!selectedTradeTarget) return;
    if (!tradeTargetId) setTradeTargetId(selectedTradeTarget.id);
  }, [selectedTradeTarget, tradeTargetId]);

  const toggleOffered = (spaceId: number) =>
    setOfferedPropertyIds((current) => (current.includes(spaceId) ? current.filter((id) => id !== spaceId) : [...current, spaceId]));
  const toggleRequested = (spaceId: number) =>
    setRequestedPropertyIds((current) => (current.includes(spaceId) ? current.filter((id) => id !== spaceId) : [...current, spaceId]));
  const submitTrade = () => {
    if (
      !selectedTradeTarget ||
      (!offeredPropertyIds.length && !requestedPropertyIds.length && offeredMoney <= 0 && requestedMoney <= 0 && offeredJailCards <= 0 && requestedJailCards <= 0)
    ) return;
    onProposeTrade(selectedTradeTarget.id, offeredPropertyIds, requestedPropertyIds, offeredMoney, requestedMoney, offeredJailCards, requestedJailCards);
    setOfferedPropertyIds([]);
    setRequestedPropertyIds([]);
    setOfferedMoney(0);
    setRequestedMoney(0);
    setOfferedJailCards(0);
    setRequestedJailCards(0);
  };

  return (
    <div className={`player-row ${active ? 'active' : ''}`}>
      <PlayerToken player={player} />
      <div>
        <strong>{player.name}{me ? ' (you)' : ''}</strong>
        <small>
          ${player.money} · {pieceLabel(getPlayerPiece(player))} · {player.properties.length} deeds
          {player.mortgagedProperties.length > 0 ? ` · ${player.mortgagedProperties.length} mortgaged` : ''}
          {player.getOutOfJailFreeCards > 0 ? ` · ${player.getOutOfJailFreeCards} jail card` : ''}
        </small>
        {player.properties.length > 0 && (
          <div className="deed-list">
            {sortPropertiesByColor(player.properties).map((spaceId) => {
              const space = board[spaceId];
              const isMortgaged = player.mortgagedProperties.includes(spaceId);
              const mortgageValue = getMortgageValue(spaceId);
              const unmortgageCost = getUnmortgageCost(spaceId);
              const hasMonopoly = ownerHasColorMonopoly(player, space);
              const improvementLevel = game.improvements[spaceId] ?? 0;
              const canBuild = canImproveProperty(game, player, spaceId) && canManage;
              const canSell = canSellImprovement(game, player, spaceId) && canManage;
              const improvementCost = getImprovementCost(spaceId);
              const improvementSaleValue = Math.floor(improvementCost / 2);
              const currentRent = calculateDisplayRent(game, player, space);
              return (
                <div key={spaceId} className={`deed-item ${isMortgaged ? 'mortgaged' : ''}`}>
                  <span className="deed-color" style={{ backgroundColor: space.color ?? 'transparent' }} aria-hidden="true" />
                  <div className="deed-details">
                    <span>{space.name}</span>
                    <small>
                      Rent {formatRent(currentRent)}
                      {hasMonopoly ? ' · Monopoly' : ''}
                      {improvementLevel > 0 ? ` · ${improvementLabel(improvementLevel)}` : ''}
                    </small>
                  </div>
                  <div className="deed-actions">
                    {space.kind === 'property' && hasMonopoly && !isMortgaged && (
                      <button disabled={!canBuild || player.money < improvementCost} onClick={() => onBuild(spaceId)}>
                        {improvementLevel === 4 ? 'Hotel' : 'House'} ${improvementCost}
                      </button>
                    )}
                    {improvementLevel > 0 && (
                      <button disabled={!canSell} onClick={() => onSellImprovement(spaceId)}>
                        Sell {improvementLevel === 5 ? 'hotel' : 'house'} ${improvementSaleValue}
                      </button>
                    )}
                    {isMortgaged ? (
                      <button disabled={!canManage || player.money < unmortgageCost} onClick={() => onUnmortgage(spaceId)}>
                        Unmortgage ${unmortgageCost}
                      </button>
                    ) : (
                      <button disabled={!canManage || improvementLevel > 0} onClick={() => onMortgage(spaceId)}>
                        Mortgage ${mortgageValue}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {canOpenTrade && selectedTradeTarget && (
          <div className="trade-builder">
            <div className="trade-builder-head">
              <strong>Trade</strong>
              <select
                value={selectedTradeTarget.id}
                onChange={(event) => {
                  setTradeTargetId(event.target.value);
                  setRequestedPropertyIds([]);
                }}
              >
                {tradeTargets.map((target) => (
                  <option key={target.id} value={target.id}>{target.name}</option>
                ))}
              </select>
            </div>
            <TradeCheckboxes title="Offer" propertyIds={player.properties} selectedIds={offeredPropertyIds} onToggle={toggleOffered} />
            <MoneyOffer label="You add" value={offeredMoney} max={player.money} onChange={setOfferedMoney} />
            <JailCardOffer label="Your jail cards" value={offeredJailCards} max={player.getOutOfJailFreeCards} onChange={setOfferedJailCards} />
            <TradeCheckboxes title="Ask for" propertyIds={selectedTradeTarget.properties} selectedIds={requestedPropertyIds} onToggle={toggleRequested} />
            <MoneyOffer label={`${selectedTradeTarget.name} adds`} value={requestedMoney} max={selectedTradeTarget.money} onChange={setRequestedMoney} />
            <JailCardOffer label={`${selectedTradeTarget.name}'s jail cards`} value={requestedJailCards} max={selectedTradeTarget.getOutOfJailFreeCards} onChange={setRequestedJailCards} />
            <button
              className="full"
              disabled={!offeredPropertyIds.length && !requestedPropertyIds.length && offeredMoney <= 0 && requestedMoney <= 0 && offeredJailCards <= 0 && requestedJailCards <= 0}
              onClick={submitTrade}
            >
              Send trade
            </button>
          </div>
        )}
      </div>
      {player.bankrupt && <span className="bankrupt">Out</span>}
    </div>
  );
}

function MoneyOffer({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="money-offer">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(clampMoney(Number(event.target.value), max))}
      />
    </label>
  );
}

function JailCardOffer({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="money-offer">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(clampMoney(Number(event.target.value), max))}
      />
    </label>
  );
}

function TradeCheckboxes({
  title,
  propertyIds,
  selectedIds,
  onToggle
}: {
  title: string;
  propertyIds: number[];
  selectedIds: number[];
  onToggle: (spaceId: number) => void;
}) {
  return (
    <div className="trade-checkboxes">
      <span>{title}</span>
      {propertyIds.length ? (
        sortPropertiesByColor(propertyIds).map((spaceId) => {
          const space = board[spaceId];
          return (
            <label key={spaceId} className="trade-check">
              <input type="checkbox" checked={selectedIds.includes(spaceId)} onChange={() => onToggle(spaceId)} />
              <span>{space.name}</span>
            </label>
          );
        })
      ) : (
        <small>No deeds</small>
      )}
    </div>
  );
}

function PlayerToken({ player }: { player: Player }) {
  const piece = getPlayerPiece(player);
  const Icon = pieceIcons[piece];
  return (
    <span className={`token ${player.color}`} title={`${player.name}: ${pieceLabel(piece)}`} aria-label={`${player.name}: ${pieceLabel(piece)}`}>
      <Icon size={16} strokeWidth={2.7} />
    </span>
  );
}

const pieceIcons: Record<PlayerPiece, LucideIcon> = {
  car: Car,
  ship: Sailboat,
  hat: Trophy,
  boot: Footprints,
  dog: Dog,
  cat: Cat,
  train: TrainFront,
  plane: Plane,
  gem: Gem,
  house: Home,
  rocket: Rocket,
  castle: Castle,
  basketball: CircleDot,
  soccer: Goal,
  volleyball: Volleyball,
  tennis: Circle,
  baseball: CircleDot,
  baseballBat: Club
};

const pieceLabels: Record<PlayerPiece, string> = {
  car: 'Racecar',
  ship: 'Ship',
  hat: 'Top hat',
  boot: 'Boot',
  dog: 'Dog',
  cat: 'Cat',
  train: 'Train',
  plane: 'Plane',
  gem: 'Gem',
  house: 'House',
  rocket: 'Rocket',
  castle: 'Castle',
  basketball: 'Basketball',
  soccer: 'Soccer ball',
  volleyball: 'Volleyball',
  tennis: 'Tennis ball',
  baseball: 'Baseball',
  baseballBat: 'Baseball bat'
};

const fallbackPieces: Record<PlayerColor, PlayerPiece> = {
  red: 'car',
  blue: 'ship',
  green: 'hat',
  gold: 'boot'
};

function getPlayerPiece(player: Player): PlayerPiece {
  return player.piece ?? fallbackPieces[player.color];
}

function pieceLabel(piece: PlayerPiece) {
  return pieceLabels[piece];
}

function getStoredPiece(): PlayerPiece {
  if (!canUseBrowser()) return 'car';
  const stored = localStorage.getItem(storagePlayerPiece);
  return playerPieces.includes(stored as PlayerPiece) ? (stored as PlayerPiece) : 'car';
}

function getMortgageValue(spaceId: number) {
  return Math.floor((board[spaceId]?.price ?? 0) / 2);
}

function getUnmortgageCost(spaceId: number) {
  const mortgageValue = getMortgageValue(spaceId);
  return mortgageValue + Math.ceil(mortgageValue * 0.1);
}

function calculateDisplayRent(game: GameState, owner: Player, space: Space) {
  const baseRent = space.rent ?? 10;
  if (space.kind === 'railroad') {
    const ownedRailroads = owner.properties.filter((spaceId) => board[spaceId]?.kind === 'railroad').length;
    return 25 * 2 ** Math.max(0, ownedRailroads - 1);
  }
  if (space.kind === 'utility') {
    const ownedUtilities = owner.properties.filter((spaceId) => board[spaceId]?.kind === 'utility').length;
    return ownedUtilities >= 2 ? '10x dice' : '4x dice';
  }
  const improvementLevel = game.improvements[space.id] ?? 0;
  if (improvementLevel > 0) return calculateImprovedRent(baseRent, improvementLevel);
  return ownerHasColorMonopoly(owner, space) ? baseRent * 2 : baseRent;
}

function formatRent(rent: number | string) {
  return typeof rent === 'number' ? `$${rent}` : rent;
}

function calculateImprovedRent(baseRent: number, improvementLevel: number) {
  const multipliers: Record<number, number> = {
    1: 5,
    2: 15,
    3: 45,
    4: 80,
    5: 125
  };
  return baseRent * (multipliers[improvementLevel] ?? 1);
}

function ownerHasColorMonopoly(owner: Player, space: Space) {
  if (space.kind !== 'property' || !space.color) return false;
  const colorGroup = getColorGroup(space);
  return colorGroup.length > 0 && colorGroup.every((candidate) => owner.properties.includes(candidate.id));
}

function canImproveProperty(game: GameState, owner: Player, spaceId: number) {
  const space = board[spaceId];
  if (!space || space.kind !== 'property' || !space.color) return false;
  if (!owner.properties.includes(spaceId) || !ownerHasColorMonopoly(owner, space)) return false;
  const group = getColorGroup(space);
  if (group.some((candidate) => owner.mortgagedProperties.includes(candidate.id))) return false;

  const level = game.improvements[spaceId] ?? 0;
  if (level >= 5) return false;
  if (level === 4) return group.every((candidate) => (game.improvements[candidate.id] ?? 0) >= 4);

  const lowestLevel = Math.min(...group.map((candidate) => game.improvements[candidate.id] ?? 0));
  return level <= lowestLevel;
}

function canSellImprovement(game: GameState, owner: Player, spaceId: number) {
  const space = board[spaceId];
  if (!space || space.kind !== 'property' || !space.color || !owner.properties.includes(spaceId)) return false;
  const level = game.improvements[spaceId] ?? 0;
  if (level <= 0) return false;
  if (level >= 5) return true;
  const group = getColorGroup(space);
  const highestLevel = Math.max(...group.map((candidate) => {
    const candidateLevel = game.improvements[candidate.id] ?? 0;
    return candidateLevel >= 5 ? 4 : candidateLevel;
  }));
  return level >= highestLevel;
}

function getColorGroup(space: Space) {
  return board.filter((candidate) => candidate.kind === 'property' && candidate.color === space.color);
}

function sortPropertiesByColor(propertyIds: number[]) {
  return [...propertyIds].sort((left, right) => {
    const leftSpace = board[left];
    const rightSpace = board[right];
    const leftGroup = leftSpace?.color ?? leftSpace?.kind ?? '';
    const rightGroup = rightSpace?.color ?? rightSpace?.kind ?? '';
    return leftGroup.localeCompare(rightGroup) || left - right;
  });
}

function getImprovementCost(spaceId: number) {
  if (spaceId <= 10) return 50;
  if (spaceId <= 20) return 100;
  if (spaceId <= 30) return 150;
  return 200;
}

function improvementLabel(level: number) {
  if (level >= 5) return 'Hotel';
  return `${level} house${level === 1 ? '' : 's'}`;
}

function clampMoney(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

