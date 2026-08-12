import { handleApi } from "../../../../lib/api";
import { createSkullKingRoom } from "../../../../lib/skull-king-rooms";

export async function POST(request) {
  return handleApi(async () => createSkullKingRoom(await request.json()));
}
