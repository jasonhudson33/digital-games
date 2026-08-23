"use client";

import { createCardGameRoomService } from "./card-game-room-service";

export const CoverYourAssetsRoomService = createCardGameRoomService("cover-your-assets", "Cover Your Assets", {
  // Every player's hand and legal actions change on each turn, so keep the
  // polling fallback responsive when real-time delivery is unavailable.
  pollInterval: 900,
  maxPollInterval: 900,
});
