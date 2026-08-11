import { handleApi } from "../../../../lib/api";
import { createPinochleRoom } from "../../../../lib/pinochle-rooms";

export async function POST(request) {
  return handleApi(async () => createPinochleRoom(await request.json()));
}
