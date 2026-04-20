import { handleApi } from "../../../lib/api";
import { createRoom } from "../../../lib/rooms";

export async function POST(request) {
  return handleApi(async () => {
    const body = await request.json();
    return createRoom(body);
  });
}
