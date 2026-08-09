export function createLocalRoomHandlers(memoryKey) {
  const rooms = globalThis[memoryKey] || new Map();
  globalThis[memoryKey] = rooms;

  return {
    async GET(_request, context) {
      const { code } = await context.params;
      return Response.json({ state: rooms.get(normalizeCode(code)) || null });
    },

    async PUT(request, context) {
      const { code } = await context.params;
      const roomCode = normalizeCode(code);
      const body = await request.json();
      if (!body?.state || normalizeCode(body.state.roomCode) !== roomCode) {
        return Response.json({ error: "Invalid room state." }, { status: 400 });
      }
      const current = rooms.get(roomCode);
      if (current && body.expectedUpdatedAt != null && Number(current.updatedAt) !== Number(body.expectedUpdatedAt)) {
        return Response.json({ error: "Room state changed." }, { status: 409 });
      }
      rooms.set(roomCode, body.state);
      return Response.json({ ok: true });
    },
  };
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
