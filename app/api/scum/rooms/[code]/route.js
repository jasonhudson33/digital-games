import { handleApi, handleRoomAction } from "../../../../../lib/api";
import {
  addScumComputer,
  getScumRoom,
  joinScumRoom,
  moveOnScumRoomPile,
  passScumRoomTurn,
  playScumRoomCards,
  removeScumComputer,
  setScumRoomOptions,
  startNextScumRoomRound,
  startScumRoom,
  submitScumRoomTrade,
} from "../../../../../lib/scum-rooms";

export async function GET(request, context) {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleApi(async () => getScumRoom({ roomCode: code, token }));
}

export async function POST(request, context) {
  const { code } = await context.params;
  return handleRoomAction(request, code, {
    join: joinScumRoom,
    addComputer: addScumComputer,
    removeComputer: removeScumComputer,
    setOptions: setScumRoomOptions,
    start: startScumRoom,
    play: playScumRoomCards,
    pass: passScumRoomTurn,
    moveOn: moveOnScumRoomPile,
    submitTrade: submitScumRoomTrade,
    nextRound: startNextScumRoomRound,
  });
}
