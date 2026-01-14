import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Setup TOTP 2FA (generate QR code)
export async function POST(request: NextRequest) {
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
    const userEmail = verified.payload.email as string;

    // Call Python script to setup TOTP
    return new Promise((resolve) => {
      const setupProcess = spawn(
        "python",
        ["-m", "src.auth.two_fa_setup", userId, userEmail],
        {
          cwd: path.join(process.cwd(), ".."),
        }
      );

      let stdout = "";
      let stderr = "";

      setupProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      setupProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      setupProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);

            if (result.success) {
              resolve(
                NextResponse.json({
                  success: true,
                  qrCodeBase64: result.qr_code_base64,
                  manualEntryKey: result.manual_entry_key,
                })
              );
            } else {
              resolve(
                NextResponse.json(
                  { error: result.error || "Failed to setup 2FA" },
                  { status: 400 }
                )
              );
            }
          } catch (err) {
            console.error("Failed to parse setup output:", stdout, stderr);
            resolve(
              NextResponse.json(
                { error: "Failed to setup 2FA" },
                { status: 500 }
              )
            );
          }
        } else {
          console.error("Setup process failed:", stderr);
          resolve(
            NextResponse.json(
              { error: "Failed to setup 2FA" },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
