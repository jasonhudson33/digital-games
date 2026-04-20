export const SUITS = ["clubs", "diamonds", "hearts", "spades"];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const RANK_NAMES = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

export function rankLabel(rank) {
  return RANK_NAMES[rank] || String(rank);
}

export function compareCards(left, right) {
  if (left.suit !== right.suit) {
    return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
  }
  return left.rank - right.rank;
}

export function sameCard(left, right) {
  return left.suit === right.suit && left.rank === right.rank;
}

export class SevenUpGame {
  static MIN_PLAYERS = 3;

  static MAX_PLAYERS = 7;

  constructor(players, dealerIndex = 0, seed = Math.random()) {
    if (players.length < SevenUpGame.MIN_PLAYERS) {
      throw new Error("7-up requires at least 3 players.");
    }
    if (players.length > SevenUpGame.MAX_PLAYERS) {
      throw new Error("This implementation supports up to 7 players.");
    }
    if (dealerIndex < 0 || dealerIndex >= players.length) {
      throw new Error("dealerIndex must refer to an existing player.");
    }

    this.players = [...players];
    this.dealerIndex = dealerIndex;
    this.currentPlayerIndex = (dealerIndex + 1) % players.length;
    this.playerStates = Object.fromEntries(
      this.players.map((player) => [player, { hand: [], passedLastTurn: false }])
    );
    this.tableau = makeEmptyTableau();
    this.winner = null;
    this.turnsTaken = 0;

    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    const random = mulberry32(seedToInt(seed));
    shuffle(deck, random);
    deck.forEach((card, offset) => {
      const player = this.players[(this.dealerIndex + 1 + offset) % this.players.length];
      this.playerStates[player].hand.push(card);
    });
    Object.values(this.playerStates).forEach((state) => {
      state.hand.sort(compareCards);
    });
  }

  static fromSnapshot(snapshot) {
    const game = Object.create(SevenUpGame.prototype);
    game.players = [...snapshot.players];
    game.dealerIndex = snapshot.dealerIndex;
    game.currentPlayerIndex = snapshot.currentPlayerIndex;
    game.winner = snapshot.winner;
    game.turnsTaken = snapshot.turnsTaken;
    game.tableau = structuredClone(snapshot.tableau);
    game.playerStates = Object.fromEntries(
      game.players.map((player) => [
        player,
        {
          hand: snapshot.hands[player].map((card) => ({ ...card })).sort(compareCards),
          passedLastTurn: Boolean(snapshot.passedLastTurn[player]),
        },
      ])
    );
    return game;
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  handFor(player) {
    this.requirePlayer(player);
    return this.playerStates[player].hand.map((card) => ({ ...card }));
  }

  stateFor(player) {
    this.requirePlayer(player);
    return this.playerStates[player];
  }

  legalMoves(player = this.currentPlayer) {
    this.requirePlayer(player);
    return this.playerStates[player].hand.filter((card) => this.isLegalCard(card));
  }

  playTurn(card = null) {
    if (this.winner) {
      throw new Error(`Game is already over. Winner: ${this.winner}`);
    }

    const player = this.currentPlayer;
    const legalMoves = this.legalMoves(player);
    if (legalMoves.length === 0) {
      if (card) {
        throw new Error(`${player} cannot play any card and must pass.`);
      }
      this.playerStates[player].passedLastTurn = true;
      this.advanceTurn();
      return `${player} passes`;
    }

    if (!card) {
      throw new Error(`${player} must play a legal card.`);
    }

    const hand = this.playerStates[player].hand;
    const handIndex = hand.findIndex((candidate) => sameCard(candidate, card));
    if (handIndex === -1) {
      throw new Error(`${player} does not have ${formatCard(card)}.`);
    }
    if (!legalMoves.some((candidate) => sameCard(candidate, card))) {
      throw new Error(`${formatCard(card)} is not a legal play for ${player}.`);
    }

    hand.splice(handIndex, 1);
    this.playerStates[player].passedLastTurn = false;
    this.placeCard(card);

    if (hand.length === 0) {
      this.winner = player;
      this.turnsTaken += 1;
      return `${player} wins by playing ${formatCard(card)}`;
    }

    this.advanceTurn();
    return `${player} plays ${formatCard(card)}`;
  }

  isLegalCard(card) {
    const lane = this.tableau[card.suit];
    if (lane.low === null) {
      return card.rank === 7;
    }
    return card.rank === lane.low - 1 || card.rank === lane.high + 1;
  }

  placeCard(card) {
    const lane = this.tableau[card.suit];
    if (card.rank === 7) {
      lane.low = 7;
      lane.high = 7;
      return;
    }
    if (lane.low === null || lane.high === null) {
      throw new Error(`Cannot play ${formatCard(card)} before the 7 of ${card.suit}.`);
    }
    if (card.rank < 7) {
      if (card.rank !== lane.low - 1) {
        throw new Error(`${formatCard(card)} does not continue downward in suit order.`);
      }
      lane.low = card.rank;
      return;
    }
    if (card.rank !== lane.high + 1) {
      throw new Error(`${formatCard(card)} does not continue upward in suit order.`);
    }
    lane.high = card.rank;
  }

  advanceTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnsTaken += 1;
  }

  snapshot() {
    return {
      players: [...this.players],
      dealerIndex: this.dealerIndex,
      currentPlayerIndex: this.currentPlayerIndex,
      winner: this.winner,
      turnsTaken: this.turnsTaken,
      tableau: structuredClone(this.tableau),
      hands: Object.fromEntries(
        this.players.map((player) => [
          player,
          this.playerStates[player].hand.map((card) => ({ ...card })),
        ])
      ),
      passedLastTurn: Object.fromEntries(
        this.players.map((player) => [player, this.playerStates[player].passedLastTurn])
      ),
    };
  }

  requirePlayer(player) {
    if (!this.playerStates[player]) {
      throw new Error(`Unknown player: ${player}`);
    }
  }
}

export function makeEmptyTableau() {
  return {
    clubs: { low: null, high: null },
    diamonds: { low: null, high: null },
    hearts: { low: null, high: null },
    spades: { low: null, high: null },
  };
}

export function buildSequence(suit, low, high) {
  const cards = [];
  for (let rank = low; rank <= high; rank += 1) {
    cards.push({ suit, rank });
  }
  return cards;
}

export function chooseComputerMove(legalMoves) {
  return [...legalMoves].sort((left, right) => {
    const leftPriority = left.rank === 7 ? 0 : 1;
    const rightPriority = right.rank === 7 ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return compareCards(left, right);
  })[0];
}

export function formatCard(card) {
  return `${rankLabel(card.rank)} of ${capitalize(card.suit)}`;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

function seedToInt(seed) {
  if (typeof seed === "number") {
    return Math.floor(seed * 1_000_000) || 1;
  }
  let hash = 0;
  for (const char of String(seed)) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
