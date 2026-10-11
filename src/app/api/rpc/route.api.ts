// Server build only: the ".api.ts" extension is enabled in next.config.ts
// when not exporting for GitHub Pages.
import { NextResponse } from "next/server";
import { endSession, getCurrentUser, startSession } from "@/lib/auth";
import { fileStore } from "@/lib/db";
import { ApiError, runOperation } from "@/lib/services";
import type { PublicUser } from "@/lib/types";

export async function POST(req: Request) {
  let body: { op?: unknown; args?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const op = String(body.op ?? "");

  try {
    if (op === "logout") {
      await endSession();
      return NextResponse.json({ data: null });
    }
    const user = await getCurrentUser();
    const data = await runOperation(op, body.args, { store: fileStore, user });
    if (op === "login" || op === "register") await startSession(data as PublicUser);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message, fields: e.fields }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
