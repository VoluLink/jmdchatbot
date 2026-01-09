import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// GET - List all users
export async function GET() {
  try {
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-m", "src.auth.list_users"],
        {
          cwd: path.join(process.cwd(), ".."),
        }
      );

      let stdout = "";

      pythonProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const users = JSON.parse(stdout);
            resolve(NextResponse.json({ users }));
          } catch {
            resolve(NextResponse.json({ users: [] }));
          }
        } else {
          resolve(NextResponse.json({ users: [] }));
        }
      });
    });
  } catch (error) {
    return NextResponse.json({ users: [] });
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-m", "src.auth.delete_user", userId],
        {
          cwd: path.join(process.cwd(), ".."),
        }
      );

      let stderr = "";

      pythonProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          resolve(NextResponse.json({ success: true }));
        } else {
          resolve(
            NextResponse.json(
              { error: stderr || "Failed to delete user" },
              { status: 400 }
            )
          );
        }
      });
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

