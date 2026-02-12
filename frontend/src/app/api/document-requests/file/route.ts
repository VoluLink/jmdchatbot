import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    return null;
  }
}

// GET - Serve a document request file (admin only)
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request);

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "File path required" }, { status: 400 });
    }

    // Security: ensure the path is within the allowed directory
    const fullPath = path.join(process.cwd(), "..", filePath);
    const allowedDir = path.join(process.cwd(), "..", "data", "document_request_uploads");

    if (!fullPath.startsWith(allowedDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file
    const fileBuffer = await fs.readFile(fullPath);
    const fileName = path.basename(fullPath);

    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".ppt": "application/vnd.ms-powerpoint",
    };

    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error serving document request file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
