import { handleApi } from "../../../../../lib/api";
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
  const body = await request.json();
  const handlers = {
    join: joinHandFootRoom,
    addComputer: addHandFootComputer,
    removeComputer: removeHandFootComputer,
    chooseTeammate: chooseHandFootTeammate,
    start: startHandFootRoom,
    draw: drawHandFootRoomCards,
    play: playHandFootRoomCards,
    discard: discardHandFootRoomCard,
    nextRound: startNextHandFootRoomRound,
  };
  if (!handlers[body.action]) return Response.json({ error: "Unknown room action." }, { status: 400 });
  return handleApi(async () => handlers[body.action]({ ...body, roomCode: code }));
}
