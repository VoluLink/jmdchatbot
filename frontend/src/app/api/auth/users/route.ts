import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// Helper function to verify admin role
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return { authorized: false, error: "Not authenticated" };
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload;

    if (payload.role !== "admin") {
      return { authorized: false, error: "Admin access required" };
    }

    return { authorized: true, userId: payload.userId };
  } catch (error) {
    return { authorized: false, error: "Invalid token" };
  }
}

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

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

// DELETE - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

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

