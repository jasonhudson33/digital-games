import { handleApi } from "../../../lib/api";
import { removeComputerPlayer } from "../../../lib/rooms";

export async function POST(request) {
  return handleApi(async () => removeComputerPlayer(await request.json()));
}
