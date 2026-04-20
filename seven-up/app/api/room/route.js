import { NextResponse } from "next/server";
import { noStoreHeaders } from "../../../lib/api";
import { getRoomState } from "../../../lib/rooms";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get("code") || "";
    const token = searchParams.get("token") || null;
    return NextResponse.json(await getRoomState({ roomCode, token }), {
      status: 200,
      headers: noStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 400, headers: noStoreHeaders() }
    );
  }
}
