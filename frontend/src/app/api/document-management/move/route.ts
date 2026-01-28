import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { normalizeRelPath, resolveUnderSources } from "../_paths";
import { verifyAdmin } from "../_auth";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      sourcePath: string;
      targetDir: string; // folder path relative to sources root ("" for root)
    };

    const sourceRel = normalizeRelPath(body.sourcePath ?? "");
    const targetDirRel = normalizeRelPath(body.targetDir ?? "");

    if (!sourceRel) {
      return NextResponse.json({ error: "sourcePath is required" }, { status: 400 });
    }

    const baseName = path.posix.basename(sourceRel);
    const destRel = targetDirRel ? path.posix.join(targetDirRel, baseName) : baseName;

    const { absTarget: absSource } = resolveUnderSources(sourceRel);
    const { absTarget: absDest } = resolveUnderSources(destRel);

    await fs.rename(absSource, absDest);

    return NextResponse.json({ ok: true, path: destRel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


