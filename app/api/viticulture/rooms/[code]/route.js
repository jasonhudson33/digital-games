import { viticultureRoomStore } from "../../../../../lib/viticulture-room-store.js";

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

export async function GET(_request, context) {
  try {
    const { code } = await context.params;
    const state = await viticultureRoomStore.load(normalizeCode(code));
    return Response.json({ state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load the room." }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const { code } = await context.params;
    const roomCode = normalizeCode(code);
    const body = await request.json();
    if (!body?.state || body.state.game !== "viticulture" || normalizeCode(body.state.roomCode) !== roomCode) {
      return Response.json({ error: "Invalid Viticulture room state." }, { status: 400 });
    }
    const current = await viticultureRoomStore.load(roomCode);
    if (current && body.expectedUpdatedAt != null && Number(current.updatedAt) !== Number(body.expectedUpdatedAt)) {
      return Response.json({ error: "Room state changed." }, { status: 409 });
    }
    await viticultureRoomStore.save(body.state);
    return Response.json({ state: body.state });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save the room." }, { status: 500 });
  }
}
