import { handleApi } from "../../../lib/api";
import { passTurn } from "../../../lib/rooms";

export async function POST(request) {
  return handleApi(async () => {
    const body = await request.json();
    return passTurn(body);
  });
}
