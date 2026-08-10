import assert from "node:assert/strict";
import test from "node:test";

import { HandFootRoomService } from "../components/hand-and-foot-room-service.js";

test("room creation reports an actionable error when the server returns HTML", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("<!DOCTYPE html><h1>Not Found</h1>", {
    status: 404,
    headers: { "Content-Type": "text/html" },
  });

  try {
    await assert.rejects(
      HandFootRoomService.create("Player"),
      /room server returned an unexpected response \(404\).*try again/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
