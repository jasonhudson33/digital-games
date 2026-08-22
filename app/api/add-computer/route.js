import { handleApi } from "../../../lib/api";
import { addComputerPlayer } from "../../../lib/rooms";

export async function POST(request) {
  return handleApi(async () => addComputerPlayer(await request.json()));
}
