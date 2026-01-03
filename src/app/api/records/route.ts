import { NextResponse } from "next/server";
import { createRecord, getAllRecords } from "@/lib/db";
import type { MediaType, ProgressUnit, RecordStatus } from "@/lib/data";
import { syncToNeoDB } from "@/lib/providers/neodb-sync";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const records = getAllRecords();
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type: MediaType;
    title: string;
    originalTitle?: string;
    year?: number;
    summary: string;
    coverUrl?: string;
    status: RecordStatus;
    rating?: number;
    tags?: string[];
    notes?: string;
    progress?: { current: number; total?: number; unit: ProgressUnit };
    startedAt?: string;
    completedAt?: string;
    sourceIds?: Record<string, string>;
  };

  if (!body?.title) {
    return NextResponse.json(
      { error: "标题不能为空" },
      { status: 400 }
    );
  }

  try {
    // Create local record first
    const { startedAt, completedAt, ...rest } = body;
    const record = createRecord(rest);

    // Sync to NeoDB if we have a neodb ID and token
    const neodbId = body.sourceIds?.neodb;
    if (neodbId) {
      try {
        const token = request.headers.get("x-neodb-token") || "";
        if (token) {
          const syncResult = await syncToNeoDB(
            {
              type: body.type,
              title: body.title,
              originalTitle: body.originalTitle,
              year: body.year,
              summary: body.summary,
              coverUrl: body.coverUrl,
              status: body.status,
              rating: body.rating,
            },
            neodbId,
            token
          );

          if (!syncResult.success) {
            // Log sync error but don't fail the request
            await logError("neodb sync failed (non-critical)", {
              recordId: record.id,
              neodbId,
              error: syncResult.error,
            });
          }
        }
      } catch (error) {
        // Log sync error but don't fail the request
        await logError("neodb sync failed (non-critical)", {
          recordId: record.id,
          neodbId,
          error,
        });
      }
    }

    return NextResponse.json({ record });
  } catch (error) {
    await logError("record creation failed", { error, body });
    return NextResponse.json(
      { error: "保存失败" },
      { status: 500 }
    );
  }
}
