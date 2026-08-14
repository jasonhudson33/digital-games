import test from "node:test";
import assert from "node:assert/strict";
import {
  acknowledgeSecretRole,
  castSecretHitlerVote,
  chancellorDiscardsPolicy,
  createSecretHitlerGame,
  eligibleChancellorIndices,
  getSecretHitlerPower,
  nominateSecretHitlerChancellor,
  presidentDiscardsPolicy,
} from "../lib/secret-hitler.js";

function seeds(count) {
  return Array.from({ length: count }, (_, index) => ({
    playerId: String(index),
    name: `Player ${index + 1}`,
    isComputer: false,
  }));
}

function acknowledgedGame(count = 5) {
  let state = createSecretHitlerGame({ playerSeeds: seeds(count), random: () => 0.42 });
  for (let index = 0; index < count; index += 1) state = acknowledgeSecretRole(state, index);
  return state;
}

test("Secret Hitler deals the correct roles for every supported table size", () => {
  const expected = {
    5: [3, 1], 6: [4, 1], 7: [4, 2], 8: [5, 2], 9: [5, 3], 10: [6, 3],
  };
  for (let count = 5; count <= 10; count += 1) {
    const game = createSecretHitlerGame({ playerSeeds: seeds(count), random: () => 0.31 });
    assert.equal(game.players.filter((player) => player.role === "hitler").length, 1);
    assert.equal(game.players.filter((player) => player.role === "liberal").length, expected[count][0]);
    assert.equal(game.players.filter((player) => player.role === "fascist").length, expected[count][1]);
    assert.equal(game.policyDeck.filter((policy) => policy === "liberal").length, 6);
    assert.equal(game.policyDeck.filter((policy) => policy === "fascist").length, 11);
  }
});

test("the first Presidential Candidate is selected randomly", () => {
  const game = createSecretHitlerGame({ playerSeeds: seeds(5), random: () => 0.61 });
  assert.equal(game.presidentIndex, 3);
});

test("a government is elected and passes one of the Chancellor's two policies", () => {
  let game = acknowledgedGame();
  const presidentIndex = game.presidentIndex;
  const nominee = eligibleChancellorIndices(game)[0];
  game = nominateSecretHitlerChancellor(game, presidentIndex, nominee);
  for (let index = 0; index < 5; index += 1) game = castSecretHitlerVote(game, index, "ja", () => 0.5);
  assert.equal(game.phase, "president_discard");
  assert.equal(game.legislativeHand.length, 3);
  game = presidentDiscardsPolicy(game, presidentIndex, 0);
  const enacted = game.legislativeHand[1];
  game = chancellorDiscardsPolicy(game, nominee, 0, () => 0.5);
  assert.equal(game.liberalPolicies + game.fascistPolicies, 1);
  assert.equal(game[`${enacted}Policies`], 1);
});

test("three failed elections enact the top policy and reset the tracker", () => {
  let game = acknowledgedGame();
  const firstPolicy = game.policyDeck[0];
  for (let election = 0; election < 3; election += 1) {
    const nominee = eligibleChancellorIndices(game)[0];
    game = nominateSecretHitlerChancellor(game, game.presidentIndex, nominee);
    for (let index = 0; index < 5; index += 1) game = castSecretHitlerVote(game, index, "nein", () => 0.5);
  }
  assert.equal(game.electionTracker, 0);
  assert.equal(game[`${firstPolicy}Policies`], 1);
  assert.equal(game.lastPresidentIndex, null);
  assert.equal(game.lastChancellorIndex, null);
});

test("executive power boards match the official player-count tracks", () => {
  assert.equal(getSecretHitlerPower(5, 3), "policy-peek");
  assert.equal(getSecretHitlerPower(5, 4), "execution");
  assert.equal(getSecretHitlerPower(7, 2), "investigate");
  assert.equal(getSecretHitlerPower(7, 3), "special-election");
  assert.equal(getSecretHitlerPower(10, 1), "investigate");
  assert.equal(getSecretHitlerPower(10, 5), "execution");
});
