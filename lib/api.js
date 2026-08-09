import { NextResponse } from "next/server";

export async function handleApi(action) {
  try {
    const payload = await action();
    return NextResponse.json(payload, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}

export async function handleRoomAction(request, roomCode, handlers) {
  const body = await request.json();
  const handler = handlers[body.action];
  if (!handler) {
    return NextResponse.json(
      { error: "Unknown room action." },
      { status: 400, headers: noStoreHeaders() }
    );
  }
  return handleApi(async () => handler({ ...body, roomCode }));
}

export function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
