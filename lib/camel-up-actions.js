import { RACING_CAMELS, TRACK_SPACES, currentPlayer, legalSpectatorSpace } from "./camel-up.js";

export const TURN_ACTIONS = ["roll", "leg", "tile", "finish", "partner"];

/**
 * Why a turn action cannot be taken right now, or `null` when it can.
 * Mirrors the engine's own checks so the panel can explain a disabled action;
 * the server still validates every submission.
 *
 * @param {any} room seat view of the room
 * @param {{ id: string, finishCards?: string[], partnerId?: string | null }} me
 * @param {"roll" | "leg" | "tile" | "finish" | "partner"} action
 * @param {string} [camelId] for `leg`: a specific camel's ticket stack
 * @returns {string | null}
 */
export function unavailableReason(room, me, action, camelId) {
  if (room.phase !== "playing") return "The race is not in play.";
  const active = currentPlayer(room);
  if (active?.id !== me.id) return `Waiting for ${active?.name ?? "another player"}.`;
  switch (action) {
    case "roll":
      return room.pyramidTicketsTaken >= 5 || room.remainingDice.length <= 1 ? "No pyramid tickets are left this leg." : null;
    case "leg":
      if (camelId) return room.legBetStacks[camelId]?.length ? null : `No ${camelId} tickets are left.`;
      return RACING_CAMELS.some((id) => room.legBetStacks[id]?.length) ? null : "Every leg ticket has been taken.";
    case "tile":
      return legalSpaces(room, me.id).length ? null : "There is no legal space for a tile right now.";
    case "finish":
      return me.finishCards?.length ? null : "All five of your finish cards are placed.";
    case "partner":
      if (room.players.length < 6) return "Partnerships need six or more players.";
      if (me.partnerId) return "You already have a partner this leg.";
      return room.players.some((player) => player.id !== me.id && !player.partnerId) ? null : "No partner is available.";
    default:
      return "Unknown action.";
  }
}

/** Spaces where `playerId` may put their spectator tile, in track order. */
export function legalSpaces(room, playerId) {
  return Array.from({ length: TRACK_SPACES - 1 }, (_, index) => index + 2).filter((space) => legalSpectatorSpace(room, playerId, space));
}
