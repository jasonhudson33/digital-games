import assert from "node:assert/strict";
import test from "node:test";

import {
  KILLER_BUNNIES_CARD_CATALOG,
  KILLER_BUNNIES_CATALOG_COUNT,
  KILLER_BUNNIES_DECK_CATALOG,
  getKillerBunniesCatalogCard,
  getKillerBunniesCatalogCardsForDeck,
  validateKillerBunniesCardCatalog,
} from "../lib/killer-bunnies-card-catalog.js";

test("the official large-card catalog contains every number from 0001 through 1485 exactly once", () => {
  assert.equal(KILLER_BUNNIES_CATALOG_COUNT, 1485);
  assert.deepEqual(validateKillerBunniesCardCatalog(), {
    valid: true,
    count: 1485,
    duplicateNumbers: [],
    duplicateIds: [],
    missingNumbers: [],
  });
  KILLER_BUNNIES_CARD_CATALOG.forEach((card, index) => {
    assert.equal(card.number, index + 1);
    assert.equal(card.catalogNumber, String(index + 1).padStart(4, "0"));
    assert.equal(card.id, `kbq-${card.catalogNumber}`);
  });
});

test("all 24 publisher deck ranges are contiguous and cover the whole catalog", () => {
  assert.equal(KILLER_BUNNIES_DECK_CATALOG.length, 24);
  assert.equal(KILLER_BUNNIES_DECK_CATALOG.reduce((total, deck) => total + deck.cardCount, 0), 1485);
  KILLER_BUNNIES_DECK_CATALOG.forEach((deck, index) => {
    assert.equal(getKillerBunniesCatalogCardsForDeck(deck.id).length, deck.cardCount);
    if (index) assert.equal(deck.firstNumber, KILLER_BUNNIES_DECK_CATALOG[index - 1].lastNumber + 1);
  });
});

test("repeated printed names remain distinct cards because their card numbers are unique", () => {
  const chooseCards = KILLER_BUNNIES_CARD_CATALOG.filter((card) => card.name === "Choose A Carrot");
  assert.ok(chooseCards.length > 20);
  assert.equal(new Set(chooseCards.map((card) => card.number)).size, chooseCards.length);
});

test("every catalog record includes a current generated behavior summary", () => {
  for (const card of KILLER_BUNNIES_CARD_CATALOG) {
    assert.equal(typeof card.detail, "string");
    assert.ok(card.detail.length > 20, `Card ${card.catalogNumber} needs a behavior summary.`);
    assert.ok(["exact", "inferred", "unverified"].includes(card.confidence));
  }
});

test("title-derived metadata captures common digital-game card families", () => {
  assert.equal(getKillerBunniesCatalogCard(1).kind, "bunny");
  assert.equal(getKillerBunniesCatalogCard(280).kind, "chooseCarrot");
  assert.equal(getKillerBunniesCatalogCard(280).carrotCount, 1);
  assert.equal(getKillerBunniesCatalogCard(284).kind, "feed");
  assert.deepEqual(getKillerBunniesCatalogCard(284).costs, { cabbage: 4, water: 1 });
  assert.equal(getKillerBunniesCatalogCard(287).kind, "weapon");
  assert.equal(getKillerBunniesCatalogCard(287).power, 13);
  assert.equal(getKillerBunniesCatalogCard(320).kind, "money");
  assert.equal(getKillerBunniesCatalogCard(320).value, 1);
});

test("the publisher checklist typo is normalized to the missing sequential number 1122", () => {
  assert.equal(getKillerBunniesCatalogCard(1121).name, "Funky Fungus – Bunny Modifier, Single");
  assert.equal(getKillerBunniesCatalogCard(1122).name, "Funky Fungus – Bunny Modifier, Double");
  assert.equal(getKillerBunniesCatalogCard(1123).name, "Goldistocks");
});

test("printed SPECIAL and VERY SPECIAL types are keyed by CIN instead of guessed from the title", () => {
  assert.equal(getKillerBunniesCatalogCard(58).type, "RUN");
  assert.equal(getKillerBunniesCatalogCard(66).type, "SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(78).type, "SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(80).type, "VERY SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(81).type, "VERY SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(145).type, "SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(152).type, "VERY SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(203).type, "VERY SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(1349).type, "SPECIAL");
  assert.equal(getKillerBunniesCatalogCard(1469).type, "SPECIAL");
});
