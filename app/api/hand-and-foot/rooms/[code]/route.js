import { handleApi, handleRoomAction } from "../../../../../lib/api";
import {
  addHandFootComputer,
  chooseHandFootTeammate,
  discardHandFootRoomCard,
  drawHandFootRoomCards,
  getHandFootRoom,
  joinHandFootRoom,
  playHandFootRoomCards,
  removeHandFootComputer,
  startHandFootRoom,
  startNextHandFootRoomRound,
} from "../../../../../lib/hand-and-foot-rooms";

export async function GET(request, context) {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleApi(async () => getHandFootRoom({ roomCode: code, token }));
}

export async function POST(request, context) {
  const { code } = await context.params;
  return handleRoomAction(request, code, {
    join: joinHandFootRoom,
    addComputer: addHandFootComputer,
    removeComputer: removeHandFootComputer,
    chooseTeammate: chooseHandFootTeammate,
    start: startHandFootRoom,
    draw: drawHandFootRoomCards,
    play: playHandFootRoomCards,
    discard: discardHandFootRoomCard,
    nextRound: startNextHandFootRoomRound,
  });
}
