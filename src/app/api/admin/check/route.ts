import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const configured = !!process.env.ENJOYRECORD_ADMIN_PASSWORD?.trim();
  return NextResponse.json({ configured });
}
