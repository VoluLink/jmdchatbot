import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// POST - Send 2FA verification code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, purpose } = body;

    if (!userId || !purpose) {
      return NextResponse.json(
        { error: "User ID and purpose are required" },
        { status: 400 }
      );
    }

    // Validate purpose
    const validPurposes = ["login", "setup", "verification"];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid purpose" },
        { status: 400 }
      );
    }

    // Call Python script to send verification code
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-m", "src.auth.two_fa_send_code", userId, purpose],
        {
          cwd: path.join(process.cwd(), ".."),
        }
      );

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", async (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);

            if (result.success) {
              resolve(
                NextResponse.json({
                  success: true,
                  expiresIn: result.expires_in,
                })
              );
            } else {
              resolve(
                NextResponse.json(
                  { error: result.error || "Failed to send code" },
                  { status: 400 }
                )
              );
            }
          } catch {
            resolve(
              NextResponse.json(
                { error: "Failed to send code" },
                { status: 500 }
              )
            );
          }
        } else {
          resolve(
            NextResponse.json(
              { error: stderr || "Failed to send code" },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error sending 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 500 }
    );
  }
}
