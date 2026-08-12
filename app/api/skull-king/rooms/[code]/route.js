import { handleApi, handleRoomAction } from "../../../../../lib/api";
import {
  addSkullKingComputer,
  bidSkullKingRoom,
  collectSkullKingRoomTrick,
  getSkullKingRoom,
  joinSkullKingRoom,
  playSkullKingRoomCard,
  removeSkullKingComputer,
  resolveSkullKingRoomPirateAbility,
  resolveSkullKingRoomWalkThePlank,
  restartSkullKingRoom,
  startNextSkullKingRoomRound,
  startSkullKingRoom,
} from "../../../../../lib/skull-king-rooms";

export async function GET(request, context) {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleApi(async () => getSkullKingRoom({ roomCode: code, token }));
}

export async function POST(request, context) {
  const { code } = await context.params;
  return handleRoomAction(request, code, {
    join: joinSkullKingRoom,
    addComputer: addSkullKingComputer,
    removeComputer: removeSkullKingComputer,
    start: startSkullKingRoom,
    bid: bidSkullKingRoom,
    playCard: playSkullKingRoomCard,
    walkThePlank: resolveSkullKingRoomWalkThePlank,
    pirateAbility: resolveSkullKingRoomPirateAbility,
    collectTrick: collectSkullKingRoomTrick,
    nextRound: startNextSkullKingRoomRound,
    restart: restartSkullKingRoom,
  });
}
