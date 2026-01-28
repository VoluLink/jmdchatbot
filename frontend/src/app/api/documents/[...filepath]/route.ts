import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { resolveUnderSources } from "../../document-management/_paths";
import { verifyAdmin } from "../../document-management/_auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  try {
    const { filepath } = await params;

    const decodedSegments = (filepath ?? []).map((seg) => decodeURIComponent(seg));
    const relPath = decodedSegments.join("/");

    const { absTarget } = resolveUnderSources(relPath);

    if (!fs.existsSync(absTarget)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(absTarget);
    if (!stat.isFile()) {
      return new NextResponse("Not a file", { status: 400 });
    }

    const fileBuffer = fs.readFileSync(absTarget);

    const ext = path.extname(decodedSegments[decodedSegments.length - 1] ?? "").toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".txt": "text/plain",
      ".html": "text/html",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${decodedSegments[decodedSegments.length - 1] ?? "document"}"`,
      },
    });
  } catch (error) {
    console.error("Error serving document:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return new NextResponse(auth.error, { status: 403 });
  }

  try {
    const { filepath } = await params;

    const decodedSegments = (filepath ?? []).map((seg) => decodeURIComponent(seg));
    const relPath = decodedSegments.join("/");

    const { absTarget } = resolveUnderSources(relPath);

    if (!fs.existsSync(absTarget)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = fs.statSync(absTarget);
    if (!stat.isFile()) {
      return new NextResponse("Not a file", { status: 400 });
    }

    fs.unlinkSync(absTarget);

    return NextResponse.json({ success: true, message: "File deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

