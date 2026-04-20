import { handleApi } from "../../../lib/api";
import { playCard } from "../../../lib/rooms";

export async function POST(request) {
  return handleApi(async () => {
    const body = await request.json();
    return playCard(body);
  });
}
