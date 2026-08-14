import { handleApi } from "../../../../lib/api";
import { createKillerBunniesRoom } from "../../../../lib/killer-bunnies-rooms";

export async function POST(request) {
  return handleApi(async () => createKillerBunniesRoom(await request.json()));
}
