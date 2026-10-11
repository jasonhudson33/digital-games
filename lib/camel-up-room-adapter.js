import {
  addComputerPlayer,
  addPlayer,
  choosePartnerTicket,
  createLobby,
  formPartnership,
  placeFinishBet,
  placeSpectator,
  removeComputerPlayer,
  rollPyramid,
  runComputerTurn,
  startGame,
  takeLegTicket,
} from "./camel-up.js";

/** Seat-safe Camel Up state: public table state plus only this seat's finish-card colors. */
export function camelUpView(game, viewerId) {
  const revealAll = game.phase === "finished";
  return {
    ...game,
    players: game.players.map((player) => ({
      ...player,
      finishCardCount: player.finishCards.length,
      finishCards: revealAll || player.id === viewerId ? [...player.finishCards] : [],
    })),
    finishBets: Object.fromEntries(Object.entries(game.finishBets || {}).map(([bet, cards]) => [
      bet,
      cards.map((card) => ({
        ...card,
        camelId: revealAll || card.playerId === viewerId ? card.camelId : null,
      })),
    ])),
  };
}

export const camelUpAdapter = {
  label: "Camel Up",
  createLobby,
  addPlayer,
  view: camelUpView,
  computerStep: runComputerTurn,
  actions: {
    addComputer: { host: true, run: (game) => addComputerPlayer(game) },
    removeComputer: { host: true, run: (game, { args }) => removeComputerPlayer(game, String(args.playerId || "")) },
    start: { host: true, run: (game, { rng }) => startGame(game, rng) },
    takeLegTicket: { run: (game, { playerId, args }) => takeLegTicket(game, playerId, String(args.camelId || "")) },
    placeSpectator: { run: (game, { playerId, args }) => placeSpectator(game, playerId, Number(args.space), String(args.side || "")) },
    rollPyramid: { run: (game, { playerId, rng }) => rollPyramid(game, playerId, rng) },
    placeFinishBet: { run: (game, { playerId, args }) => placeFinishBet(game, playerId, String(args.bet || ""), String(args.camelId || "")) },
    formPartnership: { run: (game, { playerId, args }) => formPartnership(game, playerId, String(args.partnerId || "")) },
    choosePartnerTicket: {
      run: (game, { playerId, args }) => choosePartnerTicket(game, playerId, typeof args.choiceId === "string" ? args.choiceId : null),
    },
  },
};
