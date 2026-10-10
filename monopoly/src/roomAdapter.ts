import {
  acceptTrade,
  acknowledgeCard,
  acknowledgeRent,
  addComputerPlayer,
  addLocalPlayer,
  bidAuction,
  buyImprovement,
  buyPendingProperty,
  completeAuctionPurchase,
  declinePendingProperty,
  declineTrade,
  expireTrade,
  finishDebtPayment,
  finishManagementStage,
  joinPlayer,
  makeInitialState,
  mortgageProperty,
  passAuction,
  payFlatIncomeTax,
  payForcedJailExit,
  payPercentIncomeTax,
  payToLeaveJail,
  playerPieces,
  proposeTrade,
  restartGame,
  rollDice,
  rollUtilityRent,
  sellImprovement,
  setHouseRules,
  startGame,
  stayInJailAndRoll,
  takeComputerAction,
  unmortgageProperty,
  useCardForForcedJailExit,
  useGetOutOfJailFree
} from './game';
import type { GameState, PlayerPiece } from './types';

/**
 * Monopoly on the server: game.ts unchanged behind the engine-room adapter.
 *
 * Most engine functions act on "whoever's decision is pending" without being
 * told who is asking, so this adapter works out which one player may make each
 * move and refuses anyone else. The host may act for a local seat (a hot-seat
 * player the host added on the same device) by naming it in `asPlayerId`; no one
 * else may, and the host may not act for another human's seat. Dice are rolled
 * by the engine on the server and never read from a request. Monopoly has no
 * hidden hands, so every seat's view is the whole game.
 */

type Context = { playerId: string; args: Record<string, any>; rng: () => number };
type Action = { host?: boolean; run: (game: GameState, context: Context) => GameState };

/** A seat that carries no token of its own; the host controls it. */
const isLocalSeat = (playerId: string) => playerId.startsWith('local-');

class SeatError extends Error {}

/** The player a request acts as: the sender, or a local seat the host names. */
function actingPlayer(game: GameState, { playerId, args }: Context): string {
  const named = args.asPlayerId;
  if (named === undefined || named === null || named === playerId) return playerId;
  const target = String(named);
  if (playerId !== game.hostId || !isLocalSeat(target) || !game.players.some((player) => player.id === target)) {
    throw new SeatError('You cannot act for that player.');
  }
  return target;
}

const currentId = (game: GameState) => game.players[game.currentPlayerIndex]?.id;

/** Run `act` only when the acting player is `allowedId`; otherwise change nothing. */
function ifAllowed(allowedId: (game: GameState, args: Record<string, any>) => string | undefined | null, act: (game: GameState, context: Context, actor: string) => GameState): Action {
  return {
    run: (game, context) => {
      const actor = actingPlayer(game, context);
      const allowed = allowedId(game, context.args);
      return allowed && allowed === actor ? act(game, context, actor) : game;
    }
  };
}

/** For moves on one's own property: the request must name the acting player. */
const own = (act: (game: GameState, actor: string, args: Record<string, any>) => GameState): Action => ({
  run: (game, context) => {
    const actor = actingPlayer(game, context);
    return String(context.args.playerId || '') === actor ? act(game, actor, context.args) : game;
  }
});

const numbers = (value: unknown): number[] => (Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : []);

const choosePiece = (options: any): PlayerPiece | undefined =>
  playerPieces.includes(options?.piece) ? (options.piece as PlayerPiece) : undefined;

export const monopolyAdapter = {
  label: 'Monopoly',
  acceptsOptions: true,

  createLobby(host: { id: string; name: string; options?: any }, roomCode: string): GameState {
    return makeInitialState(host.id, host.name, roomCode, choosePiece(host.options) ?? 'car');
  },

  addPlayer(game: GameState, player: { id: string; name: string; options?: any }): GameState {
    if (game.phase !== 'lobby') return game;
    const piece = choosePiece(player.options);
    if (piece && game.players.some((existing) => existing.piece === piece)) {
      throw new SeatError('That piece is already taken. Choose a different piece.');
    }
    return joinPlayer(game, player.id, player.name, piece);
  },

  view: (game: GameState) => game,
  computerStep: (game: GameState) => takeComputerAction(game),

  actions: {
    // The host runs the room.
    setHouseRules: { host: true, run: (game, { args }) => setHouseRules(game, Boolean(args.enabled)) },
    addLocal: { host: true, run: (game) => addLocalPlayer(game) },
    addComputer: { host: true, run: (game) => addComputerPlayer(game) },
    start: { host: true, run: (game, { rng }) => startGame(game, rng) },
    restart: { host: true, run: (game, { rng }) => restartGame(game, rng) },

    // The current player.
    roll: ifAllowed(currentId, (game) => rollDice(game)),
    payToLeaveJail: ifAllowed(currentId, (game) => payToLeaveJail(game)),
    useJailCard: ifAllowed(currentId, (game) => useGetOutOfJailFree(game)),
    stayInJail: ifAllowed(currentId, (game) => stayInJailAndRoll(game)),
    finishManagement: ifAllowed(currentId, (game, _context, actor) => finishManagementStage(game, actor)),

    // The player a pending decision belongs to.
    payForcedJailExit: ifAllowed((game) => game.pendingJailExit?.playerId, (game) => payForcedJailExit(game)),
    useCardForForcedJailExit: ifAllowed((game) => game.pendingJailExit?.playerId, (game) => useCardForForcedJailExit(game)),
    acknowledgeCard: ifAllowed((game) => game.pendingCard?.playerId, (game) => acknowledgeCard(game)),
    buyProperty: ifAllowed((game) => game.pendingPurchase?.playerId, (game) => buyPendingProperty(game)),
    declineProperty: ifAllowed((game) => game.pendingPurchase?.playerId, (game) => declinePendingProperty(game)),
    payFlatTax: ifAllowed((game) => game.pendingTax?.playerId, (game) => payFlatIncomeTax(game)),
    payPercentTax: ifAllowed((game) => game.pendingTax?.playerId, (game) => payPercentIncomeTax(game)),
    acknowledgeRent: ifAllowed((game) => game.pendingRent?.payerId, (game) => acknowledgeRent(game)),
    rollUtilityRent: ifAllowed((game) => game.pendingUtilityRent?.payerId, (game) => rollUtilityRent(game)),
    finishDebt: ifAllowed((game) => game.pendingDebt?.playerId, (game) => finishDebtPayment(game)),

    // Property: the owner, named in the request.
    mortgage: own((game, actor, args) => mortgageProperty(game, actor, Number(args.spaceId))),
    unmortgage: own((game, actor, args) => unmortgageProperty(game, actor, Number(args.spaceId))),
    buyImprovement: own((game, actor, args) => buyImprovement(game, actor, Number(args.spaceId))),
    sellImprovement: own((game, actor, args) => sellImprovement(game, actor, Number(args.spaceId))),

    // Trades: the proposer proposes, the recipient answers.
    proposeTrade: {
      run: (game, context) => {
        const actor = actingPlayer(game, context);
        const { args } = context;
        return proposeTrade(
          game,
          actor,
          String(args.toPlayerId || ''),
          numbers(args.offeredPropertyIds),
          numbers(args.requestedPropertyIds),
          Number(args.offeredMoney) || 0,
          Number(args.requestedMoney) || 0,
          Number(args.offeredJailCards) || 0,
          Number(args.requestedJailCards) || 0
        );
      }
    },
    acceptTrade: ifAllowed((game) => game.pendingTrade?.toPlayerId, (game) => acceptTrade(game)),
    declineTrade: ifAllowed((game) => game.pendingTrade?.toPlayerId, (game) => declineTrade(game)),
    // Any seat may ask; the engine does nothing before the expiry time, judged on the server's clock.
    expireTrade: { run: (game, { args }) => expireTrade(game, String(args.tradeId || ''), Date.now()) },

    // Auctions: the active bidder.
    bid: ifAllowed((game) => game.pendingAuction?.activePlayerId, (game) => bidAuction(game)),
    passAuction: ifAllowed((game) => game.pendingAuction?.activePlayerId, (game) => passAuction(game)),
    completeAuction: ifAllowed((game) => game.pendingAuction?.activePlayerId, (game) => completeAuctionPurchase(game))
  } as Record<string, Action>
};
