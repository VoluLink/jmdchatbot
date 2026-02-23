import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { normalizeRelPath, resolveUnderSources } from "../_paths";
import { verifyAdmin } from "../_auth";
import { getBackendBaseUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      parentPath?: string;
      name: string;
    };

    const parentRel = normalizeRelPath(body.parentPath ?? "");
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
    }

    const newRel = parentRel ? path.posix.join(parentRel, name) : name;
    const { absTarget } = resolveUnderSources(newRel);

    await fs.mkdir(absTarget, { recursive: false });

    return NextResponse.json({ ok: true, path: newRel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      path: string;
      newName: string;
    };

    const folderRel = normalizeRelPath(body.path ?? "");
    const newName = (body.newName ?? "").trim();
    if (!folderRel) {
      return NextResponse.json({ error: "Folder path is required" }, { status: 400 });
    }
    if (!newName) {
      return NextResponse.json({ error: "New folder name is required" }, { status: 400 });
    }
    if (newName.includes("/") || newName.includes("\\") || newName.includes("..")) {
      return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
    }

    const parentRel = path.posix.dirname(folderRel);
    const nextRel = parentRel === "." ? newName : path.posix.join(parentRel, newName);

    const { absTarget: absOld } = resolveUnderSources(folderRel);
    const { absTarget: absNew } = resolveUnderSources(nextRel);

    await fs.rename(absOld, absNew);

    return NextResponse.json({ ok: true, path: nextRel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      path: string;
      recursive?: boolean;
    };

    const folderRel = normalizeRelPath(body.path ?? "");
    if (!folderRel) {
      return NextResponse.json({ error: "Folder path is required" }, { status: 400 });
    }

    const { absTarget } = resolveUnderSources(folderRel);

    // Clean up vectors, metadata, and BM25 cache BEFORE deleting from disk
    try {
      const baseUrl = getBackendBaseUrl();
      // Use path prefix with trailing separator so "folderA" doesn't match "folderAB"
      const prefix = absTarget.endsWith(path.sep)
        ? absTarget
        : absTarget + path.sep;
      await fetch(`${baseUrl}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_prefixes: [prefix] }),
      });
    } catch (backendErr) {
      console.warn("Failed to clean up folder documents from index:", backendErr);
    }

    // Recursive delete (default: true for better UX)
    const recursive = body.recursive !== false;
    await fs.rm(absTarget, { recursive, force: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


