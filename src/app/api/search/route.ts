import { NextResponse } from "next/server";
import type { MediaType } from "@/lib/data";
import { searchNeoDB, basicSearch } from "@/lib/providers/neodb-search";
import { logError } from "@/lib/logger";
import { requireAdminPassword } from "@/lib/admin-auth-server";
import { isNeoDBTimeout } from "@/lib/neodb-timeout";

export const runtime = "nodejs";

const formatCause = (error: unknown) => {
  if (!(error instanceof Error)) return "";
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause) return "";
  return typeof cause === "string" ? cause : JSON.stringify(cause);
};

export async function GET(request: Request) {
  const auth = requireAdminPassword(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") as MediaType | null;
  const token = searchParams.get("token")?.trim() || undefined;
  const allowed = ["book", "film", "series", "game"];

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (type && !allowed.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const results = await searchNeoDB(type ?? undefined, query, token);
    const limitedResults = results.slice(0, 3);

    return NextResponse.json({ results: limitedResults });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search service unavailable";
    const detail = formatCause(error);
    await logError("search failed", {
      type,
      query,
      hasToken: !!token,
      error: message,
      detail: detail || undefined,
    });

    if (isNeoDBTimeout(error) || message.includes("超时")) {
      return NextResponse.json(
        { error: "NeoDB API 请求超时，请稍后重试" },
        { status: 504 }
      );
    }

    if (message.includes("Token") || message.includes("401")) {
      return NextResponse.json(
        { error: message, detail: detail || undefined },
        { status: 401 }
      );
    }

    const fallbackResults = type ? await basicSearch(type, query) : [];
    return NextResponse.json({
      results: fallbackResults.slice(0, 3),
      warning: "NeoDB search failed; using manual entry mode",
    });
  }
}
