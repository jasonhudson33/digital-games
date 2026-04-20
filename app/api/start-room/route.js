import { handleApi } from "../../../lib/api";
import { startRoom } from "../../../lib/rooms";

export async function POST(request) {
  return handleApi(async () => {
    const body = await request.json();
    return startRoom(body);
  });
}
