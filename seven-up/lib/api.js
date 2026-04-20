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

export function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
