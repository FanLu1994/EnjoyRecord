import { NextResponse } from "next/server";
import { importFromNeoDB } from "@/lib/providers/neodb-import";
import { logError } from "@/lib/logger";
import { requireAdminPassword } from "@/lib/admin-auth-server";
import { isNeoDBTimeout } from "@/lib/neodb-timeout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = requireAdminPassword(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }
  const token = request.headers.get("x-neodb-token")?.trim() || "";
  if (!token) {
    return NextResponse.json(
      { error: "Missing NeoDB token." },
      { status: 400 }
    );
  }

  try {
    const result = await importFromNeoDB(token);
    return NextResponse.json(result);
  } catch (error) {
    await logError("neodb import failed (api)", { error });
    if (isNeoDBTimeout(error)) {
      return NextResponse.json(
        { error: "NeoDB API 请求超时，请稍后重试" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "NeoDB 同步失败" },
      { status: 500 }
    );
  }
}
