import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Disable 2FA for authenticated user
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

        // Password is valid, now disable 2FA
        const disableProcess = spawn(
          "python",
          ["-m", "src.auth.two_fa_disable", userId],
          {
            cwd: path.join(process.cwd(), ".."),
          }
        );

        let stdout = "";

        disableProcess.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        disableProcess.on("close", (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);

              if (result.success) {
                resolve(
                  NextResponse.json({
                    success: true,
                  })
                );
              } else {
                resolve(
                  NextResponse.json(
                    { error: result.error || "Failed to disable 2FA" },
                    { status: 400 }
                  )
                );
              }
            } catch {
              resolve(
                NextResponse.json(
                  { error: "Failed to disable 2FA" },
                  { status: 500 }
                )
              );
            }
          } else {
            resolve(
              NextResponse.json(
                { error: "Failed to disable 2FA" },
                { status: 500 }
              )
            );
          }
        });
      });
    });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
