import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Regenerate backup codes for authenticated user
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

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // First, verify the password
    return new Promise((resolve) => {
      const verifyProcess = spawn(
        "python",
        ["-m", "src.auth.verify_user", userEmail, password],
        {
          cwd: path.join(process.cwd(), ".."),
        }
      );

      verifyProcess.on("close", (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              { error: "Invalid password" },
              { status: 401 }
            )
          );
          return;
        }

        // Password is valid, now regenerate backup codes
        const regenerateProcess = spawn(
          "python",
          ["-m", "src.auth.two_fa_regenerate_backups", userId],
          {
            cwd: path.join(process.cwd(), ".."),
          }
        );

        let stdout = "";

        regenerateProcess.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        regenerateProcess.on("close", (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);

              if (result.success) {
                resolve(
                  NextResponse.json({
                    success: true,
                    backupCodes: result.backup_codes,
                  })
                );
              } else {
                resolve(
                  NextResponse.json(
                    { error: result.error || "Failed to regenerate backup codes" },
                    { status: 400 }
                  )
                );
              }
            } catch {
              resolve(
                NextResponse.json(
                  { error: "Failed to regenerate backup codes" },
                  { status: 500 }
                )
              );
            }
          } else {
            resolve(
              NextResponse.json(
                { error: "Failed to regenerate backup codes" },
                { status: 500 }
              )
            );
          }
        });
      });
    });
  } catch (error) {
    console.error("Error regenerating backup codes:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
