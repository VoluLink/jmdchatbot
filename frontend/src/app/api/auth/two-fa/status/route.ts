import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// GET - Get 2FA status for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify JWT
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.userId as string;

    // Call Python script to get 2FA status
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-c", `
import sys
import json
from src.auth.two_fa_manager import get_two_fa_status

user_id = sys.argv[1]
status = get_two_fa_status(user_id)
print(json.dumps(status))
        `.trim(), userId],
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
            const status = JSON.parse(stdout);

            resolve(
              NextResponse.json({
                enabled: status.enabled,
                phoneNumberMasked: status.phone_masked,
                enrolledAt: status.enrolled_at,
                backupCodesRemaining: status.backup_codes_remaining,
              })
            );
          } catch {
            resolve(
              NextResponse.json(
                { error: "Failed to get 2FA status" },
                { status: 500 }
              )
            );
          }
        } else {
          resolve(
            NextResponse.json(
              { error: "Failed to get 2FA status" },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error getting 2FA status:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}
