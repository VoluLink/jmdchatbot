import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// POST - Run URL refresh job (check for changes)
export async function POST() {
  try {
    // Execute Python script
    return new Promise((resolve) => {
      const pythonProcess = spawn("python", ["-m", "src.updater.url_refresh_job"], {
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
              message: "URL check completed successfully",
              output: stdout,
            })
          );
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "URL check failed",
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
    console.error("Error running URL check job:", error);
    return NextResponse.json(
      { error: "Failed to run URL check job" },
      { status: 500 }
    );
  }
}

