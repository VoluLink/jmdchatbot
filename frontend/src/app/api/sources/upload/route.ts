import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { resolveUnderSources } from "../../document-management/_paths";

// POST - Upload files
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const targetFolder = (formData.get("targetFolder") as string) || "";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const { absTarget: targetDir } = resolveUnderSources(targetFolder);

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    const uploadedFiles: string[] = [];
    const errors: { file: string; error: string }[] = [];

    for (const file of files) {
      try {
        const fileName = file.name;
        const filePath = path.join(targetDir, fileName);

        // Check if file already exists
        try {
          await fs.access(filePath);
          errors.push({
            file: fileName,
            error: "File already exists",
          });
          continue;
        } catch {
          // File doesn't exist, proceed with upload
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Write file
        await fs.writeFile(filePath, buffer);
        uploadedFiles.push(fileName);
      } catch (error) {
        errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

