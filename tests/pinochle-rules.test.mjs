import test from "node:test";
import assert from "node:assert/strict";
import {
  PINOCHLE_SUITS,
  acknowledgePinochleExchange,
  canTakeRestOfPinochleTricks,
  calculatePinochleMeld,
  choosePinochleBotBid,
  choosePinochleBotCard,
  choosePinochleBotDiscard,
  choosePinochleBotPartnerPass,
  choosePinochleBotPartnerReturn,
  choosePinochleBotTrump,
  choosePinochleTrump,
  clearPinochleTrick,
  createPinochleDeck,
  createPinochleGame,
  declareTwoPlayerPinochleMeld,
  discardPinochleKitty,
  getAvailableTwoPlayerMelds,
  getLegalPinochleCards,
  migratePinochleScoring,
  passPinochleBid,
  passPinochlePartnerCards,
  placePinochleBid,
  playPinochleCard,
  returnPinochlePartnerCards,
  skipTwoPlayerPinochleMeld,
  takeRestOfPinochleTricks,
} from "../lib/pinochle.js";

function players(count) {
  return Array.from({ length: count }, (_, index) => ({
    playerId: `p${index}`,
    name: `Player ${index + 1}`,
    isComputer: false,
  }));
}

test("Pinochle creates the right deck and seating for every supported room size", () => {
  for (const count of [2, 3, 4, 5, 6]) {
    const game = createPinochleGame({ playerSeeds: players(count) });
    assert.equal(createPinochleDeck(count).length, count === 6 ? 96 : 48);
    assert.equal(game.players.length, count);
    const expectedHandSize = count === 2 ? 12 : Math.floor(createPinochleDeck(count).length / count);
    assert.ok(game.players.every((player) => player.hand.length === expectedHandSize));
    assert.equal(game.kittySize, createPinochleDeck(count).length % count);
  }
  assert.deepEqual(createPinochleGame({ playerSeeds: players(4) }).players.map((player) => player.teamId), [0, 1, 0, 1]);
  assert.deepEqual(createPinochleGame({ playerSeeds: players(6) }).players.map((player) => player.teamId), [0, 1, 0, 1, 0, 1]);
  assert.deepEqual(createPinochleGame({ playerSeeds: players(5) }).players.map((player) => player.teamId), [0, 1, 2, 3, 4]);
});

test("the opening bidder can be selected without changing table order", () => {
  const game = createPinochleGame({ playerSeeds: players(4), startingPlayerIndex: 3 });
  assert.equal(game.startingPlayerIndex, 3);
  assert.equal(game.dealerIndex, 2);
  assert.equal(game.currentPlayerIndex, 3);
});

test("two-player Pinochle deals twelve each and turns a stock card up for trump", () => {
  const game = createPinochleGame({ playerSeeds: players(2) });
  assert.equal(game.phase, "playing");
  assert.ok(game.players.every((player) => player.hand.length === 12));
  assert.equal(game.stock.length, 23);
  assert.ok(game.stockTrumpCard);
  assert.equal(game.trump, game.stockTrumpCard.suit);
  assert.equal(game.highBidderIndex, null);
  assert.equal(game.currentPlayerIndex, 1);
});

test("an open two-player stock allows any response, then closed-stock trick rules apply", () => {
  const base = createPinochleGame({ playerSeeds: players(2) });
  const followerHand = [
    { id: "follow-club", copy: 0, suit: "clubs", rank: 9 },
    { id: "off-suit", copy: 0, suit: "hearts", rank: 14 },
  ];
  const state = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 1,
    trump: "spades",
    trick: [{ playerIndex: 0, card: { id: "lead-club", copy: 1, suit: "clubs", rank: 11 } }],
    players: base.players.map((player, index) => index === 1 ? { ...player, hand: followerHand } : player),
    stock: [{ id: "stock", copy: 1, suit: "diamonds", rank: 9 }],
    stockTrumpCard: { id: "turned", copy: 1, suit: "spades", rank: 9 },
  };
  assert.deepEqual(getLegalPinochleCards(state, 1).map((card) => card.id), ["follow-club", "off-suit"]);
  assert.deepEqual(getLegalPinochleCards({ ...state, stock: [], stockTrumpCard: null }, 1).map((card) => card.id), ["follow-club"]);
});

test("a two-player computer follows the led suit instead of playing trump", () => {
  const base = createPinochleGame({ playerSeeds: players(2) });
  const state = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 1,
    trump: "spades",
    trick: [{ playerIndex: 0, card: { id: "lead-club", copy: 1, suit: "clubs", rank: 11 } }],
    players: base.players.map((player, index) => index === 1 ? {
      ...player,
      isComputer: true,
      hand: [
        { id: "follow-club", copy: 0, suit: "clubs", rank: 9 },
        { id: "trump-ace", copy: 0, suit: "spades", rank: 14 },
      ],
    } : player),
    stock: [{ id: "stock", copy: 1, suit: "diamonds", rank: 9 }],
    stockTrumpCard: { id: "turned", copy: 1, suit: "spades", rank: 9 },
  };
  assert.equal(choosePinochleBotCard(state, 1).id, "follow-club");
});

test("a two-player trick winner may declare only one new meld before drawing", () => {
  const base = createPinochleGame({ playerSeeds: players(2) });
  const winnerHand = [
    { id: "kh", copy: 0, suit: "hearts", rank: 13 },
    { id: "qh", copy: 0, suit: "hearts", rank: 12 },
    { id: "qs", copy: 0, suit: "spades", rank: 12 },
    { id: "jd", copy: 0, suit: "diamonds", rank: 11 },
  ];
  let game = {
    ...base,
    phase: "two-player-melding",
    currentPlayerIndex: 0,
    leadPlayerIndex: 0,
    trump: "hearts",
    players: base.players.map((player, index) => ({ ...player, hand: index === 0 ? winnerHand : [] })),
    melds: base.players.map(() => ({ total: 0, items: [] })),
    teamMeldPoints: [0, 0],
    twoPlayerDeclaredMeldPoints: [{}, {}],
    stock: [{ id: "winner-draw", copy: 1, suit: "clubs", rank: 9 }],
    stockTrumpCard: { id: "loser-draw", copy: 1, suit: "hearts", rank: 9 },
  };
  const available = getAvailableTwoPlayerMelds(game, 0);
  assert.ok(available.some((meld) => meld.key.startsWith("Royal marriage")));
  assert.ok(available.some((meld) => meld.key === "Pinochle"));
  const marriage = available.find((meld) => meld.key.startsWith("Royal marriage"));
  game = declareTwoPlayerPinochleMeld(game, 0, marriage.key);
  assert.equal(game.phase, "playing");
  assert.equal(game.melds[0].items.length, 1);
  assert.equal(game.melds[0].total, 40);
  assert.equal(game.players[0].hand.length, 5);
  assert.equal(game.players[1].hand.length, 1);
  assert.equal(game.stock.length, 0);
  assert.equal(game.stockTrumpCard, null);

  const nextOpportunity = { ...game, phase: "two-player-melding", currentPlayerIndex: 0 };
  assert.ok(!getAvailableTwoPlayerMelds(nextOpportunity, 0).some((meld) => meld.key === marriage.key));
  assert.ok(getAvailableTwoPlayerMelds(nextOpportunity, 0).some((meld) => meld.key === "Pinochle"));
  const improvedOpportunity = {
    ...nextOpportunity,
    players: nextOpportunity.players.map((player, index) => index === 0 ? {
      ...player,
      hand: [
        ...player.hand,
        { id: "kh-2", copy: 1, suit: "hearts", rank: 13 },
        { id: "qh-2", copy: 1, suit: "hearts", rank: 12 },
      ],
    } : player),
  };
  assert.equal(getAvailableTwoPlayerMelds(improvedOpportunity, 0).find((meld) => meld.key === marriage.key).points, 40);
});

test("take the rest requires a fresh lead, an empty stock, only trump or aces, and no opposing trump", () => {
  const base = createPinochleGame({ playerSeeds: players(2) });
  const eligible = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    leadPlayerIndex: 0,
    trump: "hearts",
    trick: [],
    stock: [],
    stockTrumpCard: null,
    players: base.players.map((player, index) => ({
      ...player,
      hand: index === 0
        ? [{ id: "trump-nine", copy: 0, suit: "hearts", rank: 9 }, { id: "club-ace", copy: 0, suit: "clubs", rank: 14 }]
        : [{ id: "club-king", copy: 0, suit: "clubs", rank: 13 }, { id: "diamond-ten", copy: 0, suit: "diamonds", rank: 10 }],
    })),
  };
  assert.equal(canTakeRestOfPinochleTricks(eligible, 0), true);
  assert.equal(canTakeRestOfPinochleTricks({ ...eligible, stock: [{ id: "stock", copy: 1, suit: "clubs", rank: 9 }] }, 0), false);
  assert.equal(canTakeRestOfPinochleTricks({ ...eligible, trick: [{ playerIndex: 0, card: eligible.players[0].hand[0] }] }, 0), false);
  assert.equal(canTakeRestOfPinochleTricks({
    ...eligible,
    players: eligible.players.map((player, index) => index === 0
      ? { ...player, hand: [{ ...player.hand[0], suit: "clubs", rank: 13 }, player.hand[1]] }
      : player),
  }, 0), false);
  assert.equal(canTakeRestOfPinochleTricks({
    ...eligible,
    players: eligible.players.map((player, index) => index === 1
      ? { ...player, hand: [{ ...player.hand[0], suit: "hearts" }, player.hand[1]] }
      : player),
  }, 0), false);
});

test("take the rest awards every remaining counter, trick, and the last-trick bonus", () => {
  const base = createPinochleGame({ playerSeeds: players(2) });
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    leadPlayerIndex: 0,
    trump: "hearts",
    trick: [],
    stock: [],
    stockTrumpCard: null,
    players: base.players.map((player, index) => ({
      ...player,
      hand: index === 0
        ? [{ id: "trump-nine", copy: 0, suit: "hearts", rank: 9 }, { id: "club-ace", copy: 0, suit: "clubs", rank: 14 }]
        : [{ id: "club-king", copy: 0, suit: "clubs", rank: 13 }, { id: "diamond-ten", copy: 0, suit: "diamonds", rank: 10 }],
    })),
  };
  const finished = takeRestOfPinochleTricks(game, 0);
  assert.equal(finished.phase, "round-over");
  assert.equal(finished.tookRestTrickCount, 2);
  assert.equal(finished.tookRestPoints, 40);
  assert.equal(finished.players[0].tricksWon, 2);
  assert.equal(finished.players[0].roundTrickPoints, 40);
  assert.ok(finished.players.every((player) => player.hand.length === 0));
  assert.equal(finished.roundSummary.roundDeltas[0], 40);
  assert.equal(finished.teams[0].score, 40);
});

test("five-player Pinochle uses one deck, a three-card kitty, and a minimum bid of 150", () => {
  const game = createPinochleGame({ playerSeeds: players(5) });
  assert.equal(createPinochleDeck(5).length, 48);
  assert.equal(game.minimumBid, 150);
  assert.equal(game.kittySize, 3);
  assert.equal(game.kitty.length, 3);
  assert.ok(game.players.every((player) => player.hand.length === 9));
  assert.equal(game.targetScore, 1500);
});

test("older Pinochle games upgrade every stored score to trailing-zero values", () => {
  const current = createPinochleGame({ playerSeeds: players(3) });
  const older = {
    ...current,
    scoringScale: undefined,
    targetScore: 150,
    minimumBid: 20,
    highBid: 21,
    bidHistory: [{ playerIndex: 1, amount: 21 }, { playerIndex: 2, amount: null }],
    teams: current.teams.map((team, index) => ({ ...team, score: index === 0 ? 12 : 0 })),
    players: current.players.map((player, index) => ({ ...player, roundTrickPoints: index === 0 ? 3 : 0 })),
    melds: [{ total: 4, items: [{ name: "Pinochle", points: 4, cards: [] }] }],
    teamMeldPoints: [4, 0, 0],
    lastTrick: { cards: [], winnerPlayerIndex: 0, points: 2 },
  };
  const upgraded = migratePinochleScoring(older);
  assert.equal(upgraded.targetScore, 1500);
  assert.equal(upgraded.minimumBid, 200);
  assert.equal(upgraded.highBid, 210);
  assert.deepEqual(upgraded.bidHistory.map((bid) => bid.amount), [210, null]);
  assert.equal(upgraded.teams[0].score, 120);
  assert.equal(upgraded.players[0].roundTrickPoints, 30);
  assert.equal(upgraded.melds[0].total, 40);
  assert.equal(upgraded.melds[0].items[0].points, 40);
  assert.equal(upgraded.lastTrick.points, 20);
  assert.strictEqual(migratePinochleScoring(upgraded), upgraded);
});

test("meld scoring recognizes a run, pinochle, arounds, and dix", () => {
  const cards = [
    ...[14, 10, 13, 12, 11, 9].map((rank, copy) => ({ id: `h-${rank}`, copy, suit: "hearts", rank })),
    { id: "ac", copy: 0, suit: "clubs", rank: 14 },
    { id: "ad", copy: 0, suit: "diamonds", rank: 14 },
    { id: "as", copy: 0, suit: "spades", rank: 14 },
    { id: "qs", copy: 0, suit: "spades", rank: 12 },
    { id: "jd", copy: 0, suit: "diamonds", rank: 11 },
  ];
  const meld = calculatePinochleMeld(cards, "hearts");
  assert.equal(meld.total, 300);
  assert.ok(meld.items.some((item) => item.name.startsWith("Run")));
  assert.ok(meld.items.some((item) => item.name.startsWith("Pinochle")));
  assert.ok(meld.items.some((item) => item.name.startsWith("As around")));
  assert.ok(meld.items.some((item) => item.name.startsWith("Dix")));
  assert.ok(meld.items.every((item) => item.cards.length > 0));
  assert.deepEqual(
    meld.items.find((item) => item.name === "Pinochle").cards.map((card) => `${card.rank}-${card.suit}`),
    ["12-spades", "11-diamonds"],
  );
});

test("bidding ends with the last active player and advances to trump", () => {
  let game = createPinochleGame({ playerSeeds: players(3) });
  assert.equal(game.currentPlayerIndex, 1);
  game = placePinochleBid(game, 1, 200);
  game = passPinochleBid(game, 2);
  game = passPinochleBid(game, 0);
  assert.equal(game.phase, "choosing-trump");
  assert.equal(game.highBidderIndex, 1);
  assert.equal(game.highBid, 200);
});

test("a computer raises the bid when its hand supports the contract", () => {
  const game = createPinochleGame({ playerSeeds: players(3) });
  const strongHand = [
    ...[14, 10, 13, 12, 11].map((rank, copy) => ({ id: `run-${rank}`, copy, suit: "hearts", rank })),
    ...["clubs", "diamonds", "spades"].map((suit, copy) => ({ id: `ace-${suit}`, copy, suit, rank: 14 })),
  ];
  const withStrongComputer = {
    ...game,
    highBid: 200,
    players: game.players.map((player, index) => index === 1 ? { ...player, hand: strongHand } : player),
  };
  assert.equal(choosePinochleBotBid(withStrongComputer, 1), 210);
});

test("partnership bidding lets a human teammate continue after the opponents pass", () => {
  let game = createPinochleGame({
    playerSeeds: players(4).map((player, index) => ({ ...player, isComputer: index === 3 })),
  });
  game = placePinochleBid(game, 1, 200);
  game = passPinochleBid(game, 2);
  game = placePinochleBid(game, 3, 210);
  game = passPinochleBid(game, 0);

  assert.equal(game.phase, "bidding");
  assert.equal(game.currentPlayerIndex, 1);
  assert.deepEqual(game.passedPlayerIndexes, [2, 0]);

  game = placePinochleBid(game, 1, 220);
  game = passPinochleBid(game, 3);
  assert.equal(game.phase, "choosing-trump");
  assert.equal(game.highBidderIndex, 1);
});

test("a computer never raises against a teammate when no opposing bidder remains", () => {
  const game = createPinochleGame({
    playerSeeds: players(4).map((player, index) => ({ ...player, isComputer: index === 3 })),
  });
  const sameTeamAuction = {
    ...game,
    highBid: 200,
    highBidderIndex: 1,
    currentPlayerIndex: 3,
    passedPlayerIndexes: [0, 2],
  };
  assert.equal(choosePinochleBotBid(sameTeamAuction, 3), null);
});

test("the winning bidder leads the first trick", () => {
  let game = createPinochleGame({ playerSeeds: players(3) });
  game = placePinochleBid(game, 1, 200);
  game = passPinochleBid(game, 2);
  game = passPinochleBid(game, 0);
  game = choosePinochleTrump(game, 1, "clubs");
  assert.equal(game.phase, "playing");
  assert.equal(game.highBidderIndex, 1);
  assert.equal(game.leadPlayerIndex, 1);
  assert.equal(game.currentPlayerIndex, 1);
});

test("trick play requires following suit and heading when possible", () => {
  let game = createPinochleGame({ playerSeeds: players(3) });
  game = placePinochleBid(game, 1, 200);
  game = passPinochleBid(game, 2);
  game = passPinochleBid(game, 0);
  game = choosePinochleTrump(game, 1, "hearts");

  const leader = game.currentPlayerIndex;
  const lead = game.players[leader].hand.find((card) => card.suit !== "hearts") || game.players[leader].hand[0];
  game = playPinochleCard(game, leader, lead.id);
  const follower = game.currentPlayerIndex;
  const matching = game.players[follower].hand.filter((card) => card.suit === lead.suit);
  const legal = getLegalPinochleCards(game, follower);
  if (matching.length) {
    assert.ok(legal.every((card) => card.suit === lead.suit));
    const offSuit = game.players[follower].hand.find((card) => card.suit !== lead.suit);
    if (offSuit) assert.throws(() => playPinochleCard(game, follower, offSuit.id), /follow suit/);
  } else {
    const trumps = game.players[follower].hand.filter((card) => card.suit === "hearts");
    if (trumps.length) assert.ok(legal.every((card) => card.suit === "hearts"));
  }
});

test("all standard suits are available as trump", () => {
  assert.deepEqual(PINOCHLE_SUITS, ["clubs", "diamonds", "spades", "hearts"]);
});

test("four-player bidder exchanges four cards with their teammate", () => {
  let game = createPinochleGame({ playerSeeds: players(4) });
  game = placePinochleBid(game, 1, 200);
  game = passPinochleBid(game, 2);
  game = passPinochleBid(game, 3);
  game = passPinochleBid(game, 0);
  game = choosePinochleTrump(game, 1, "hearts");

  assert.equal(game.phase, "partner-passing");
  assert.equal(game.exchangeCount, 4);
  assert.deepEqual(game.exchangePartnerIndexes, [3]);
  const sentIds = game.players[3].hand.slice(0, 4).map((card) => card.id);
  game = passPinochlePartnerCards(game, 3, sentIds);
  assert.equal(game.phase, "acknowledging-exchange");
  assert.equal(game.currentPlayerIndex, 1);
  assert.deepEqual(game.exchangeAcknowledgment.cards.map((card) => card.id), sentIds);
  game = acknowledgePinochleExchange(game, 1);
  assert.equal(game.phase, "bidder-returning");
  assert.equal(game.players[1].hand.length, 16);
  assert.equal(game.players[3].hand.length, 8);

  const returnedIds = game.players[1].hand.slice(0, 4).map((card) => card.id);
  game = returnPinochlePartnerCards(game, 1, returnedIds);
  assert.equal(game.phase, "acknowledging-exchange");
  assert.equal(game.currentPlayerIndex, 3);
  assert.deepEqual(game.exchangeAcknowledgment.cards.map((card) => card.id), returnedIds);
  game = acknowledgePinochleExchange(game, 3);
  assert.equal(game.phase, "playing");
  assert.equal(game.currentPlayerIndex, 1);
  assert.ok(game.players.every((player) => player.hand.length === 12));
});

test("six-player bidder exchanges three cards with each teammate", () => {
  let game = createPinochleGame({ playerSeeds: players(6) });
  game = placePinochleBid(game, 1, 500);
  for (const index of [2, 3, 4, 5, 0]) game = passPinochleBid(game, index);
  game = choosePinochleTrump(game, 1, "spades");

  assert.equal(game.phase, "partner-passing");
  assert.equal(game.exchangeCount, 3);
  assert.deepEqual(game.exchangePartnerIndexes, [3, 5]);
  game = passPinochlePartnerCards(game, 3, game.players[3].hand.slice(0, 3).map((card) => card.id));
  assert.equal(game.phase, "acknowledging-exchange");
  assert.equal(game.currentPlayerIndex, 1);
  game = acknowledgePinochleExchange(game, 1);
  assert.equal(game.currentPlayerIndex, 5);
  game = passPinochlePartnerCards(game, 5, game.players[5].hand.slice(0, 3).map((card) => card.id));
  assert.equal(game.phase, "acknowledging-exchange");
  game = acknowledgePinochleExchange(game, 1);
  assert.equal(game.phase, "bidder-returning");
  assert.equal(game.players[1].hand.length, 22);

  game = returnPinochlePartnerCards(game, 1, game.players[1].hand.slice(0, 3).map((card) => card.id));
  assert.equal(game.phase, "acknowledging-exchange");
  assert.deepEqual(game.exchangeReturnQueue, [5]);
  game = acknowledgePinochleExchange(game, 3);
  game = returnPinochlePartnerCards(game, 1, game.players[1].hand.slice(0, 3).map((card) => card.id));
  assert.equal(game.phase, "acknowledging-exchange");
  game = acknowledgePinochleExchange(game, 5);
  assert.equal(game.phase, "playing");
  assert.equal(game.currentPlayerIndex, 1);
  assert.ok(game.players.every((player) => player.hand.length === 16));
});

test("three-player cutthroat tables skip partner trading", () => {
  for (const count of [3]) {
    let game = createPinochleGame({ playerSeeds: players(count) });
    const bidder = game.currentPlayerIndex;
    game = placePinochleBid(game, bidder, game.minimumBid);
    while (game.phase === "bidding") game = passPinochleBid(game, game.currentPlayerIndex);
    game = choosePinochleTrump(game, bidder, "clubs");
    assert.equal(game.phase, "playing");
  }
});

test("an impossible three-player contract is set, scores opposing meld, and redeals", () => {
  let game = createPinochleGame({ playerSeeds: players(3) });
  const bidder = game.currentPlayerIndex;
  const trump = "hearts";
  const melds = game.players.map((player) => calculatePinochleMeld(player.hand, trump));
  game = placePinochleBid(game, bidder, 9990);
  while (game.phase === "bidding") game = passPinochleBid(game, game.currentPlayerIndex);
  game = choosePinochleTrump(game, bidder, trump);

  assert.equal(game.roundNumber, 2);
  assert.equal(game.phase, "bidding");
  assert.equal(game.lastWashSummary.washed, true);
  assert.equal(game.lastWashSummary.maximumTrickPoints, 250);
  assert.equal(game.lastWashSummary.maximumContractPoints, melds[bidder].total + 250);
  assert.equal(game.teams[bidder].score, -9990);
  for (const index of [0, 1, 2].filter((index) => index !== bidder)) {
    assert.equal(game.teams[index].score, melds[index].total);
  }
  assert.ok(game.players.every((player) => player.hand.length === 16));
});

test("a contract that can exactly reach its bid is played instead of washed", () => {
  let game = createPinochleGame({ playerSeeds: players(3) });
  const bidder = game.currentPlayerIndex;
  const trump = "diamonds";
  const maximumContractPoints = calculatePinochleMeld(game.players[bidder].hand, trump).total + 250;
  game = placePinochleBid(game, bidder, maximumContractPoints);
  while (game.phase === "bidding") game = passPinochleBid(game, game.currentPlayerIndex);
  game = choosePinochleTrump(game, bidder, trump);

  assert.equal(game.roundNumber, 1);
  assert.equal(game.phase, "playing");
  assert.equal(game.lastWashSummary, null);
});

test("an impossible partnership contract sets the bidding team and banks the opponents' meld", () => {
  let game = createPinochleGame({ playerSeeds: players(4) });
  const bidder = game.currentPlayerIndex;
  game = placePinochleBid(game, bidder, 9990);
  while (game.phase === "bidding") game = passPinochleBid(game, game.currentPlayerIndex);
  game = choosePinochleTrump(game, bidder, "spades");
  const partner = game.currentPlayerIndex;
  game = passPinochlePartnerCards(game, partner, game.players[partner].hand.slice(0, 4).map((card) => card.id));
  game = acknowledgePinochleExchange(game, bidder);
  game = returnPinochlePartnerCards(game, bidder, game.players[bidder].hand.slice(0, 4).map((card) => card.id));
  game = acknowledgePinochleExchange(game, partner);

  const biddingTeamId = game.lastWashSummary.biddingTeamId;
  const opposingTeamId = biddingTeamId === 0 ? 1 : 0;
  assert.equal(game.roundNumber, 2);
  assert.equal(game.phase, "bidding");
  assert.equal(game.teams[biddingTeamId].score, -9990);
  assert.equal(game.teams[opposingTeamId].score, game.lastWashSummary.teamMeldPoints[opposingTeamId]);
  assert.equal(game.lastWashSummary.roundDeltas[opposingTeamId], game.lastWashSummary.teamMeldPoints[opposingTeamId]);
});

test("an impossible five-player contract sets every trump-jack partner and banks each opponent's meld", () => {
  let game = createPinochleGame({ playerSeeds: players(5) });
  game.players[2].hand[0] = { ...game.players[2].hand[0], suit: "hearts", rank: 11 };
  const bidder = game.currentPlayerIndex;
  game = placePinochleBid(game, bidder, 9990);
  while (game.phase === "bidding") game = passPinochleBid(game, game.currentPlayerIndex);
  game = choosePinochleTrump(game, bidder, "hearts");
  const discards = game.players[bidder].hand.filter((card) => card.suit !== "hearts" || card.rank !== 11).slice(0, 3);
  const discardIds = discards.map((card) => card.id);
  const finalHands = game.players.map((player, index) => index === bidder
    ? player.hand.filter((card) => !discardIds.includes(card.id))
    : player.hand);
  const melds = finalHands.map((hand) => calculatePinochleMeld(hand, "hearts"));
  const contractPlayerIndexes = finalHands.flatMap((hand, index) => index === bidder
    || hand.some((card) => card.suit === "hearts" && card.rank === 11)
    ? [index]
    : []);
  game = discardPinochleKitty(game, bidder, discardIds);

  assert.equal(game.roundNumber, 2);
  assert.equal(game.phase, "bidding");
  assert.ok(contractPlayerIndexes.includes(2));
  assert.deepEqual(game.lastWashSummary.contractPlayerIndexes, contractPlayerIndexes);
  for (const index of game.players.map((_, index) => index)) {
    assert.equal(game.teams[index].score, contractPlayerIndexes.includes(index) ? -9990 : melds[index].total);
  }
});

test("five-player trump-jack holders join the bidder and share the set penalty", () => {
  let game = createPinochleGame({
    playerSeeds: players(5).map((player) => ({ ...player, isComputer: true })),
  });
  game.players[2].hand[0] = { ...game.players[2].hand[0], suit: "hearts", rank: 11 };
  game = placePinochleBid(game, 1, 150);
  for (const index of [2, 3, 4, 0]) game = passPinochleBid(game, index);
  assert.equal(game.phase, "choosing-trump");
  assert.equal(game.players[1].hand.length, 12);
  game = choosePinochleTrump(game, 1, "hearts");
  assert.equal(game.phase, "discarding-kitty");
  assert.equal(game.players[1].hand.length, 12);
  const discards = game.players[1].hand.filter((card) => card.suit !== "hearts" || card.rank !== 11).slice(0, 3);
  assert.equal(discards.length, 3);
  game = discardPinochleKitty(game, 1, discards.map((card) => card.id));
  assert.equal(game.phase, "playing");
  game = { ...game, highBid: 9990 };
  assert.ok(game.contractPlayerIndexes.includes(1));
  assert.ok(game.contractPlayerIndexes.includes(2));
  assert.deepEqual(game.revealedContractPlayerIndexes, []);
  assert.ok(game.players.every((player) => player.hand.length === 9));

  const hiddenPlay = game.players[2].hand.find((card) => card.suit !== "hearts" || card.rank !== 11);
  const afterHiddenPlay = playPinochleCard({ ...game, currentPlayerIndex: 2, leadPlayerIndex: 2, trick: [] }, 2, hiddenPlay.id);
  assert.deepEqual(afterHiddenPlay.revealedContractPlayerIndexes, []);

  const trumpJack = game.players[2].hand.find((card) => card.suit === "hearts" && card.rank === 11);
  const afterTrumpJack = playPinochleCard({ ...game, currentPlayerIndex: 2, leadPlayerIndex: 2, trick: [] }, 2, trumpJack.id);
  assert.deepEqual(afterTrumpJack.revealedContractPlayerIndexes, [2]);

  let actions = 0;
  while (!['round-over', 'game-over'].includes(game.phase) && actions < 100) {
    const playerIndex = game.currentPlayerIndex;
    if (game.phase === "playing") {
      game = playPinochleCard(game, playerIndex, choosePinochleBotCard(game, playerIndex).id);
    } else if (game.phase === "trick-complete") {
      game = clearPinochleTrick(game);
    }
    actions += 1;
  }
  assert.equal(game.roundSummary.madeContract, false);
  for (const index of game.contractPlayerIndexes) assert.equal(game.roundSummary.roundDeltas[index], -9990);
  for (const index of game.players.map((_, index) => index).filter((index) => !game.contractPlayerIndexes.includes(index))) {
    assert.notEqual(game.roundSummary.roundDeltas[index], -9990);
  }
});

test("a made five-player contract pays each bidder-team player only their own meld and tricks", () => {
  const finalCards = [
    { id: "final-j", copy: 0, suit: "clubs", rank: 11 },
    { id: "final-a", copy: 0, suit: "clubs", rank: 14 },
    { id: "final-10", copy: 0, suit: "clubs", rank: 10 },
    { id: "final-k", copy: 0, suit: "clubs", rank: 13 },
    { id: "final-q", copy: 0, suit: "clubs", rank: 12 },
  ];
  let game = createPinochleGame({ playerSeeds: players(5) });
  game = {
    ...game,
    phase: "playing",
    trump: "clubs",
    highBid: 150,
    highBidderIndex: 1,
    currentPlayerIndex: 1,
    leadPlayerIndex: 1,
    contractPlayerIndexes: [1, 2],
    trick: [],
    trickNumber: 8,
    melds: [0, 20, 30, 0, 0].map((total) => ({ total, items: [] })),
    teamMeldPoints: [0, 20, 30, 0, 0],
    players: game.players.map((player, index) => ({
      ...player,
      hand: [finalCards[index]],
      roundTrickPoints: index === 1 ? 40 : index === 2 ? 50 : 0,
      tricksWon: index === 1 || index === 2 ? 1 : 0,
    })),
  };
  for (const playerIndex of [1, 2, 3, 4, 0]) {
    game = playPinochleCard(game, playerIndex, finalCards[playerIndex].id);
  }
  game = clearPinochleTrick(game);
  assert.equal(game.roundSummary.madeContract, true);
  assert.equal(game.roundSummary.bidderMeldPoints, 20);
  assert.equal(game.roundSummary.contractTrickPoints, 130);
  assert.equal(game.roundSummary.contractPoints, 150);
  assert.equal(game.roundSummary.scoringPoints[1], 100);
  assert.equal(game.roundSummary.scoringPoints[2], 80);
  assert.equal(game.roundSummary.roundDeltas[1], 100);
  assert.equal(game.roundSummary.roundDeltas[2], 80);
});

test("a trump-jack partner's meld cannot make a five-player contract", () => {
  const game = {
    ...createPinochleGame({ playerSeeds: players(5) }),
    highBid: 160,
    highBidderIndex: 1,
    contractPlayerIndexes: [1, 2],
    melds: [0, 20, 100, 0, 0].map((total) => ({ total, items: [] })),
    teamMeldPoints: [0, 20, 100, 0, 0],
    players: createPinochleGame({ playerSeeds: players(5) }).players.map((player, index) => ({
      ...player,
      hand: [],
      roundTrickPoints: index === 1 ? 70 : index === 2 ? 60 : 0,
      tricksWon: index === 1 || index === 2 ? 1 : 0,
    })),
    phase: "trick-complete",
    pendingRoundEnd: true,
    trick: [],
  };
  const finished = clearPinochleTrick(game);
  assert.equal(finished.roundSummary.contractPoints, 150);
  assert.equal(finished.roundSummary.madeContract, false);
  assert.equal(finished.roundSummary.roundDeltas[1], -160);
  assert.equal(finished.roundSummary.roundDeltas[2], -160);
});

test("a completed trick stays face-up until it is cleared", () => {
  let game = createPinochleGame({ playerSeeds: players(3) });
  game = placePinochleBid(game, 1, 200);
  game = passPinochleBid(game, 2);
  game = passPinochleBid(game, 0);
  game = choosePinochleTrump(game, 1, "diamonds");
  while (game.trickNumber === 0) {
    const playerIndex = game.currentPlayerIndex;
    game = playPinochleCard(game, playerIndex, choosePinochleBotCard(game, playerIndex).id);
  }
  assert.equal(game.phase, "trick-complete");
  assert.equal(game.trick.length, 3);
  assert.equal(game.lastTrick.cards.length, 3);
  const completedCardIds = game.lastTrick.cards.map((play) => play.card.id);
  const trickWinnerIndex = game.lastTrick.winnerPlayerIndex;
  game = clearPinochleTrick(game);
  assert.equal(game.phase, "playing");
  assert.equal(game.trick.length, 0);
  assert.equal(game.currentPlayerIndex, trickWinnerIndex);
  const nextPlayerIndex = game.currentPlayerIndex;
  game = playPinochleCard(game, nextPlayerIndex, choosePinochleBotCard(game, nextPlayerIndex).id);
  assert.equal(game.trick.length, 1);
  assert.deepEqual(game.lastTrick.cards.map((play) => play.card.id), completedCardIds);
});

test("computer players can complete a full round at every table size", () => {
  for (const count of [2, 3, 4, 5, 6]) {
    let game = createPinochleGame({
      playerSeeds: players(count).map((player) => ({ ...player, isComputer: true })),
    });
    let actions = 0;
    while (!["round-over", "game-over"].includes(game.phase) && actions < 200) {
      const playerIndex = game.currentPlayerIndex;
      if (game.phase === "bidding") {
        const bid = choosePinochleBotBid(game, playerIndex);
        game = bid === null ? passPinochleBid(game, playerIndex) : placePinochleBid(game, playerIndex, bid);
      } else if (game.phase === "choosing-trump") {
        game = choosePinochleTrump(game, playerIndex, choosePinochleBotTrump(game, playerIndex));
      } else if (game.phase === "discarding-kitty") {
        game = discardPinochleKitty(game, playerIndex, choosePinochleBotDiscard(game, playerIndex));
      } else if (game.phase === "partner-passing") {
        game = passPinochlePartnerCards(game, playerIndex, choosePinochleBotPartnerPass(game, playerIndex));
      } else if (game.phase === "bidder-returning") {
        game = returnPinochlePartnerCards(game, playerIndex, choosePinochleBotPartnerReturn(game, playerIndex));
      } else if (game.phase === "acknowledging-exchange") {
        game = acknowledgePinochleExchange(game, playerIndex);
      } else if (game.phase === "two-player-melding") {
        const meld = getAvailableTwoPlayerMelds(game, playerIndex)[0];
        game = meld ? declareTwoPlayerPinochleMeld(game, playerIndex, meld.key) : skipTwoPlayerPinochleMeld(game, playerIndex);
      } else if (game.phase === "trick-complete") {
        game = clearPinochleTrick(game);
      } else if (game.phase === "playing") {
        game = playPinochleCard(game, playerIndex, choosePinochleBotCard(game, playerIndex).id);
      }
      actions += 1;
    }
    assert.ok(["round-over", "game-over"].includes(game.phase), `${count}-player round should finish`);
    assert.equal(game.trickNumber, Math.floor(createPinochleDeck(count).length / count));
    assert.ok(game.roundSummary);
  }
});
