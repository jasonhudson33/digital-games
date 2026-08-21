import { createClientRoomRoute } from "../../../../../lib/client-room-route.js";
import { coverYourAssetsRoomStore } from "../../../../../lib/cover-your-assets-room-store.js";

const handlers = createClientRoomRoute({
  store: coverYourAssetsRoomStore,
  label: "Cover Your Assets",
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
