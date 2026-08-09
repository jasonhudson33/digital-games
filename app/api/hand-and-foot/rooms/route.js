import { handleApi } from "../../../../lib/api";
import { createHandFootRoom } from "../../../../lib/hand-and-foot-rooms";

export async function POST(request) {
  return handleApi(async () => createHandFootRoom(await request.json()));
}
