import { NextResponse } from "next/server";
import { deleteRecord, updateRecord } from "@/lib/db";
import type { Progress, ProgressUnit, RecordStatus } from "@/lib/data";
import { logError } from "@/lib/logger";
import { requireAdminPassword } from "@/lib/admin-auth-server";

export const runtime = "nodejs";

const STATUS_OPTIONS: RecordStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "paused",
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  const auth = requireAdminPassword(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }
  const body = (await request.json()) as {
    status?: RecordStatus;
    progress?: { current: number; total?: number; unit: ProgressUnit };
    note?: string;
    rating?: number | null;
    notes?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "Missing record id." }, { status: 400 });
  }

  if (body.status && !STATUS_OPTIONS.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  let progress: Progress | undefined;
  if (body.progress) {
    const current = Number(body.progress.current);
    const total =
      body.progress.total === undefined ? undefined : Number(body.progress.total);
    if (
      Number.isNaN(current) ||
      (total !== undefined && Number.isNaN(total)) ||
      !body.progress.unit
    ) {
      return NextResponse.json({ error: "Invalid progress values." }, { status: 400 });
    }
    progress = {
      current,
      total,
      unit: body.progress.unit,
    };
  }

  let rating: number | null | undefined = undefined;
  if (body.rating !== undefined) {
    if (body.rating === null) {
      rating = null;
    } else {
      const numericRating = Number(body.rating);
      if (Number.isNaN(numericRating)) {
        return NextResponse.json({ error: "Invalid rating value." }, { status: 400 });
      }
      if (numericRating < 0 || numericRating > 10) {
        return NextResponse.json({ error: "Rating must be between 0 and 10." }, { status: 400 });
      }
      rating = Math.round(numericRating * 10) / 10;
    }
  }

  if (!body.status && !progress && !body.note && body.rating === undefined && !body.notes) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  if (body.notes && body.notes.trim().length > 200) {
    return NextResponse.json({ error: "评价不能超过 200 字" }, { status: 400 });
  }

  try {
    const updated = updateRecord(id, {
      status: body.status,
      progress,
      historyNote: body.note,
      rating,
      notes: body.notes?.trim() || undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    return NextResponse.json({ record: updated });
  } catch (error) {
    await logError("record update failed", { id, error, body });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  if (!id) {
    return NextResponse.json({ error: "Missing record id." }, { status: 400 });
  }
  const auth = requireAdminPassword(_request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const removed = deleteRecord(id);
    if (!removed) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    await logError("record delete failed", { id, error });
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
