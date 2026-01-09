import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

import { resolveUnderSources } from "../../../document-management/_paths";

const execAsync = promisify(exec);

// GET - Get document preview (text extraction for DOCX, etc.)
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

    const ext = path.extname(absTarget).toLowerCase();

    // Extract text based on file type
    let text = "";

    if (ext === ".txt" || ext === ".md") {
      // Plain text files
      text = fs.readFileSync(absTarget, "utf-8");
    } else if (ext === ".docx") {
      // DOCX - use Python to extract text
      try {
        const pythonScript = path.join(process.cwd(), "..", "scripts", "extract_docx.py");
        const { stdout } = await execAsync(`python "${pythonScript}" "${absTarget}"`);
        text = stdout;
      } catch (error) {
        text = "Fehler beim Extrahieren des DOCX-Inhalts.";
      }
    } else if (ext === ".pdf") {
      // PDF - use Python to extract text
      try {
        const pythonScript = path.join(process.cwd(), "..", "scripts", "extract_pdf.py");
        const { stdout } = await execAsync(`python "${pythonScript}" "${absTarget}"`);
        text = stdout;
      } catch (error) {
        text = "Fehler beim Extrahieren des PDF-Inhalts.";
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file type for text preview" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error extracting document preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

