import { NextResponse } from "next/server";
import { requireAdminPassword } from "@/lib/admin-auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = requireAdminPassword(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }
  return NextResponse.json({ ok: true });
}
