const memoryRooms = globalThis.__monopolyRooms || new Map();
globalThis.__monopolyRooms = memoryRooms;

export async function GET(_request, context) {
  const { code } = await context.params;
  const roomCode = normalizeCode(code);
  const state = memoryRooms.get(roomCode) || null;
  return Response.json({ state });
}

export async function PUT(request, context) {
  const { code } = await context.params;
  const roomCode = normalizeCode(code);
  const body = await request.json();
  if (!body?.state || body.state.roomCode?.toUpperCase() !== roomCode) {
    return Response.json({ error: "Invalid room state." }, { status: 400 });
  }
  memoryRooms.set(roomCode, body.state);
  return Response.json({ ok: true });
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
