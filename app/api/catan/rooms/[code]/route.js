const memoryRooms = globalThis.__catanRooms || new Map();
globalThis.__catanRooms = memoryRooms;

export async function GET(_request, context) {
  const { code } = await context.params;
  const roomCode = normalizeCode(code);
  return Response.json({ state: memoryRooms.get(roomCode) || null });
}

export async function PUT(request, context) {
  const { code } = await context.params;
  const roomCode = normalizeCode(code);
  const body = await request.json();
  if (!body?.state || body.state.roomCode?.toUpperCase() !== roomCode) {
    return Response.json({ error: "Invalid room state." }, { status: 400 });
  }
  const current = memoryRooms.get(roomCode);
  if (current && body.expectedUpdatedAt != null && Number(current.updatedAt) !== Number(body.expectedUpdatedAt)) {
    return Response.json({ error: "Room state changed." }, { status: 409 });
  }
  memoryRooms.set(roomCode, body.state);
  return Response.json({ ok: true });
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
