import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    
    // Build the path to the document
    const documentsDir = path.join(process.cwd(), "..", "data", "sources");
    const filePath = path.join(documentsDir, decodedFilename);
    
    // Security check: ensure the file is within the sources directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(documentsDir);
    
    if (!resolvedPath.startsWith(resolvedDir)) {
      return new NextResponse("Access denied", { status: 403 });
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(resolvedPath);
    
    // Determine content type
    const ext = path.extname(decodedFilename).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".txt": "text/plain",
      ".html": "text/html",
    };
    
    const contentType = contentTypes[ext] || "application/octet-stream";
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${decodedFilename}"`,
      },
    });
  } catch (error) {
    console.error("Error serving document:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

