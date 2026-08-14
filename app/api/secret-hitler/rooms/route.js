import { handleApi } from "../../../../lib/api";
import { createSecretHitlerRoom } from "../../../../lib/secret-hitler-rooms";

export async function POST(request) {
  return handleApi(async () => createSecretHitlerRoom(await request.json()));
}
