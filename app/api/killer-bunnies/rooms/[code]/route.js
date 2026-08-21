import { handleApi, handleRoomAction } from "../../../../../lib/api";
import {
  addKillerBunniesComputer,
  buyKillerBunniesRoomShopItem,
  chooseKillerBunniesSpecialRoom,
  chooseKillerBunniesRoomCarrot,
  chooseKillerBunniesRoomDefectorTarget,
  chooseKillerBunniesRoomMisfortuneTarget,
  chooseKillerBunniesRoomModifierTarget,
  drawKillerBunniesRoomPile,
  discardKillerBunniesRoomDefectorDetector,
  discardExtraKillerBunniesRoomCard,
  getKillerBunniesRoom,
  joinKillerBunniesRoom,
  playKillerBunniesTopRun,
  playSavedKillerBunniesRoomSpecial,
  removeKillerBunniesComputer,
  replaceKillerBunniesRoomRun,
  resolveKillerBunniesRoomDefense,
  resolveKillerBunniesRoomDefectorRoll,
  resolveKillerBunniesRoomImmediateCard,
  resolveKillerBunniesRoomManualCard,
  setKillerBunniesExpansions,
  startKillerBunniesRoom,
  targetKillerBunniesBunny,
  chooseInitialKillerBunniesRoomRun,
} from "../../../../../lib/killer-bunnies-rooms";

export async function GET(request, context) {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get("token") || "";
  return handleApi(async () => getKillerBunniesRoom({ roomCode: code, token }));
}

export async function POST(request, context) {
  const { code } = await context.params;
  return handleRoomAction(request, code, {
    join: joinKillerBunniesRoom,
    addComputer: addKillerBunniesComputer,
    removeComputer: removeKillerBunniesComputer,
    setExpansions: setKillerBunniesExpansions,
    start: startKillerBunniesRoom,
    chooseInitialRun: chooseInitialKillerBunniesRoomRun,
    playTopRun: playKillerBunniesTopRun,
    specialChoice: chooseKillerBunniesSpecialRoom,
    playSaved: playSavedKillerBunniesRoomSpecial,
    targetBunny: targetKillerBunniesBunny,
    resolveDefense: resolveKillerBunniesRoomDefense,
    resolveManualCard: resolveKillerBunniesRoomManualCard,
    resolveImmediateCard: resolveKillerBunniesRoomImmediateCard,
    chooseMisfortuneTarget: chooseKillerBunniesRoomMisfortuneTarget,
    chooseModifierTarget: chooseKillerBunniesRoomModifierTarget,
    chooseDefectorTarget: chooseKillerBunniesRoomDefectorTarget,
    discardDefectorDetector: discardKillerBunniesRoomDefectorDetector,
    resolveDefectorRoll: resolveKillerBunniesRoomDefectorRoll,
    chooseCarrot: chooseKillerBunniesRoomCarrot,
    drawPile: drawKillerBunniesRoomPile,
    buyShopItem: buyKillerBunniesRoomShopItem,
    replaceRun: replaceKillerBunniesRoomRun,
    discardExtra: discardExtraKillerBunniesRoomCard,
  });
}
