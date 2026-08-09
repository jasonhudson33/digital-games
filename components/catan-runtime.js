import { hasCitiesKnights, rollEventDie } from "./catan-rules.js";

export function createCatanRuntime(random = Math.random, now = Date.now) {
  return {
    now,
    rollDice(game) {
      const chosenDice = game.citiesKnights?.alchemyDice?.playerId === game.players[game.currentPlayerIndex]?.id
        ? game.citiesKnights.alchemyDice.dice
        : null;
      return {
        dieOne: chosenDice?.[0] ?? Math.floor(random() * 6) + 1,
        dieTwo: chosenDice?.[1] ?? Math.floor(random() * 6) + 1,
        eventDie: hasCitiesKnights(game) ? rollEventDie(random) : null,
      };
    },
  };
}

export const catanRuntime = createCatanRuntime();
