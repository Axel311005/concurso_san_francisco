import { NextRequest, NextResponse } from "next/server";
import {
  buildSyncPayload,
  loadSessionByCode,
} from "@/lib/sync/buildSyncPayload";
import type { SyncRole } from "@/lib/types";

const roles: SyncRole[] = ["display", "team", "moderator", "judge"];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const roleParam = request.nextUrl.searchParams.get("role") ?? "display";
  const role = roles.includes(roleParam as SyncRole)
    ? (roleParam as SyncRole)
    : "display";
  const since = Number(request.nextUrl.searchParams.get("since") ?? "0");
  const teamId = request.nextUrl.searchParams.get("teamId") ?? undefined;

  const session = await loadSessionByCode(code);
  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const payload = await buildSyncPayload(session, role, since, teamId);
  return NextResponse.json(payload);
}
