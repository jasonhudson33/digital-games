import { handleApi } from "../../../../lib/api";
import { createScumRoom } from "../../../../lib/scum-rooms";

export async function POST(request) {
  return handleApi(async () => createScumRoom(await request.json()));
}
