export type PlayerColor = 'red' | 'blue' | 'green' | 'gold';
export type PlayerPiece =
  | 'car'
  | 'ship'
  | 'hat'
  | 'boot'
  | 'dog'
  | 'cat'
  | 'train'
  | 'plane'
  | 'gem'
  | 'house'
  | 'rocket'
  | 'castle'
  | 'basketball'
  | 'soccer'
  | 'volleyball'
  | 'tennis'
  | 'baseball'
  | 'baseballBat';

export type SpaceKind =
  | 'go'
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community'
  | 'jail'
  | 'free'
  | 'goToJail';

export type Space = {
  id: number;
  name: string;
  kind: SpaceKind;
  price?: number;
  rent?: number;
  color?: string;
};

export type Player = {
  id: string;
  name: string;
  isComputer: boolean;
  color: PlayerColor;
  piece: PlayerPiece;
  position: number;
  money: number;
  properties: number[];
  mortgagedProperties: number[];
  getOutOfJailFreeCards: number;
  getOutOfJailFreeCardDecks?: CardDeck[];
  jailTurnCount: number;
  inJail: boolean;
  bankrupt: boolean;
};

export type Improvements = Record<string, number>;

export type LogEntry = {
  id: string;
  text: string;
};

export type DiceRoll = {
  dieOne: number;
  dieTwo: number;
  isDouble: boolean;
  nonce: number;
  playerId: string;
};

export type CardDeck = 'chance' | 'community';

export type DrawnCard = {
  id: string;
  deck: CardDeck;
  title: string;
  text: string;
  actionText: string;
  playerId: string;
};

export type PendingPurchase = {
  spaceId: number;
  playerId: string;
};

export type PendingTax = {
  spaceId: number;
  playerId: string;
  flatAmount: number;
  percentAmount: number;
};

export type PendingRent = {
  spaceId: number;
  payerId: string;
  ownerId: string;
  amount: number;
  isMortgaged: boolean;
  hasMonopoly: boolean;
  rentNote?: string;
};

export type PendingUtilityRent = {
  spaceId: number;
  payerId: string;
  ownerId: string;
  multiplier: number;
  isChanceRate?: boolean;
};

export type PendingDebt = {
  playerId: string;
  creditorId: string | null;
  amountOwed: number;
  reason: string;
};

export type PendingAuction = {
  spaceId: number;
  currentBid: number;
  highBidderId: string | null;
  activePlayerId: string;
  passedPlayerIds: string[];
};

export type PendingJailExit = {
  playerId: string;
  dieOne: number;
  dieTwo: number;
};

export type PendingTrade = {
  id: string;
  expiresAt: number;
  fromPlayerId: string;
  toPlayerId: string;
  offeredPropertyIds: number[];
  requestedPropertyIds: number[];
  offeredMoney: number;
  requestedMoney: number;
  offeredJailCards: number;
  requestedJailCards: number;
};

export type JailRollMode = 'paid' | 'card' | 'stay' | null;
export type TurnStage = 'manage' | 'roll';

export type GameState = {
  roomCode: string;
  hostId: string;
  players: Player[];
  currentPlayerIndex: number;
  phase: 'lobby' | 'playing' | 'gameOver';
  turnStage: TurnStage;
  turnStageVersion: number;
  lastRoll: DiceRoll | null;
  doubleRollCount: number;
  jailRollMode: JailRollMode;
  pendingCard: DrawnCard | null;
  pendingCardQueue: DrawnCard[];
  pendingPurchase: PendingPurchase | null;
  pendingTax: PendingTax | null;
  pendingRent: PendingRent | null;
  pendingUtilityRent: PendingUtilityRent | null;
  pendingDebt: PendingDebt | null;
  pendingAuction: PendingAuction | null;
  pendingJailExit: PendingJailExit | null;
  pendingTrade: PendingTrade | null;
  improvements: Improvements;
  log: LogEntry[];
  createdAt: number;
  updatedAt: number;
};
