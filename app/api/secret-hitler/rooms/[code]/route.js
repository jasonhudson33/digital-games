import { handleApi, handleRoomAction } from "../../../../../lib/api";
import {
  acknowledgeSecretHitlerRoomRole,
  addSecretHitlerComputer,
  answerSecretHitlerRoomVeto,
  discardSecretHitlerChancellorPolicy,
  discardSecretHitlerPresidentPolicy,
  finishSecretHitlerRoomPower,
  getSecretHitlerRoom,
  joinSecretHitlerRoom,
  nominateSecretHitlerRoomChancellor,
  removeSecretHitlerComputer,
  requestSecretHitlerRoomVeto,
  resetSecretHitlerRoom,
  startSecretHitlerRoom,
  useSecretHitlerRoomPower,
  voteSecretHitlerRoom,
} from "../../../../../lib/secret-hitler-rooms";

export async function GET(request, context) {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleApi(async () => getSecretHitlerRoom({ roomCode: code, token }));
}

export async function POST(request, context) {
  const { code } = await context.params;
  return handleRoomAction(request, code, {
    join: joinSecretHitlerRoom,
    addComputer: addSecretHitlerComputer,
    removeComputer: removeSecretHitlerComputer,
    start: startSecretHitlerRoom,
    acknowledgeRole: acknowledgeSecretHitlerRoomRole,
    nominate: nominateSecretHitlerRoomChancellor,
    vote: voteSecretHitlerRoom,
    presidentDiscard: discardSecretHitlerPresidentPolicy,
    chancellorDiscard: discardSecretHitlerChancellorPolicy,
    requestVeto: requestSecretHitlerRoomVeto,
    answerVeto: answerSecretHitlerRoomVeto,
    usePower: useSecretHitlerRoomPower,
    finishPower: finishSecretHitlerRoomPower,
    reset: resetSecretHitlerRoom,
  });
}
