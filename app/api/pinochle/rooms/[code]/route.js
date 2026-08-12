import { handleApi, handleRoomAction } from "../../../../../lib/api";
import {
  addPinochleComputer,
  bidPinochleRoom,
  choosePinochleRoomTrump,
  clearPinochleRoomTrick,
  declareTwoPlayerPinochleRoomMeld,
  discardPinochleRoomKitty,
  getPinochleRoom,
  joinPinochleRoom,
  passPinochleRoom,
  passPinochleRoomPartnerCards,
  playPinochleRoomCard,
  removePinochleComputer,
  startNextPinochleRoomRound,
  startPinochleRoom,
  skipTwoPlayerPinochleRoomMeld,
  takeRestOfPinochleRoomTricks,
  returnPinochleRoomPartnerCards,
} from "../../../../../lib/pinochle-rooms";

export async function GET(request, context) {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleApi(async () => getPinochleRoom({ roomCode: code, token }));
}

export async function POST(request, context) {
  const { code } = await context.params;
  return handleRoomAction(request, code, {
    join: joinPinochleRoom,
    addComputer: addPinochleComputer,
    removeComputer: removePinochleComputer,
    start: startPinochleRoom,
    bid: bidPinochleRoom,
    pass: passPinochleRoom,
    chooseTrump: choosePinochleRoomTrump,
    discardKitty: discardPinochleRoomKitty,
    passPartnerCards: passPinochleRoomPartnerCards,
    returnPartnerCards: returnPinochleRoomPartnerCards,
    playCard: playPinochleRoomCard,
    takeRest: takeRestOfPinochleRoomTricks,
    clearTrick: clearPinochleRoomTrick,
    declareMeld: declareTwoPlayerPinochleRoomMeld,
    skipMeld: skipTwoPlayerPinochleRoomMeld,
    nextRound: startNextPinochleRoomRound,
  });
}
