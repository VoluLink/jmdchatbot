import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// POST - Apply pending update for a URL source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, applyAll } = body;

    if (!id && !applyAll) {
      return NextResponse.json(
        { error: "Must specify id or applyAll=true" },
        { status: 400 }
      );
    }

    // Path to Python script
    const scriptPath = path.join(process.cwd(), "..", "src", "updater", "apply_url_updates.py");
    
    // Build command args
    const args = ["-m", "src.updater.apply_url_updates"];
    if (applyAll) {
      args.push("--all");
    } else {
      args.push("--source-id", id);
    }

    // Execute Python script
    return new Promise((resolve) => {
      const process = spawn("python", args, {
        cwd: path.join(process.cwd(), ".."),
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(
            NextResponse.json({
              success: true,
              message: "Update applied successfully",
              output: stdout,
            })
          );
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Failed to apply update",
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
    console.error("Error applying URL update:", error);
    return NextResponse.json(
      { error: "Failed to apply update" },
      { status: 500 }
    );
  }
}

