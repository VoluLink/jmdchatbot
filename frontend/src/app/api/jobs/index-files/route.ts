import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// POST - Run indexing job for local files
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { force = false, semantic = false } = body;

    // Build command args
    const args = ["-m", "src.updater.advanced_jobs"];
    if (force) args.push("--force");
    if (semantic) args.push("--semantic");

    // Execute Python script
    return new Promise<Response>((resolve) => {
      const pythonProcess = spawn("python", args, {
        cwd: path.join(process.cwd(), ".."),
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          resolve(
            NextResponse.json({
              success: true,
              message: "Indexing completed successfully",
              output: stdout,
            })
          );
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Indexing failed",
                output: stdout,
                stderr: stderr,
              },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error running indexing job:", error);
    return NextResponse.json(
      { error: "Failed to run indexing job" },
      { status: 500 }
    );
  }
}

