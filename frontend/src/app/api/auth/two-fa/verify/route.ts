import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// Helper function to verify pending session and get user
async function verifyPendingSession(sessionToken: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      "python",
      ["-c", `
import sys
import json
from src.auth.two_fa_manager import verify_pending_session

session_token = sys.argv[1]
user = verify_pending_session(session_token)
print(json.dumps(user if user else {}))
      `.trim(), sessionToken],
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
          const user = JSON.parse(stdout);
          if (user && user.id) {
            resolve(user);
          } else {
            reject(new Error("Invalid session"));
          }
        } catch {
          reject(new Error("Failed to parse user data"));
        }
      } else {
        reject(new Error("Failed to verify session"));
      }
    });
  });
}

// POST - Verify 2FA TOTP code or backup code during login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, code } = body;

    if (!sessionToken || !code) {
      return NextResponse.json(
        { error: "Session token and code are required" },
        { status: 400 }
      );
    }

    // Verify pending session and get user info
    let userInfo;
    try {
      userInfo = await verifyPendingSession(sessionToken);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Call Python script to verify TOTP code or backup code
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-m", "src.auth.two_fa_verify_login", userInfo.id, code],
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

      pythonProcess.on("close", async (verifyCode) => {
        if (verifyCode === 0) {
          try {
            const result = JSON.parse(stdout);

            if (result.success) {
              // Consume the pending session
              const consumeProcess = spawn(
                "python",
                ["-c", `
from src.auth.two_fa_manager import consume_pending_session
consume_pending_session("${sessionToken}")
                `.trim()],
                {
                  cwd: path.join(process.cwd(), ".."),
                }
              );

              consumeProcess.on("close", async () => {
                // Create JWT token
                const token = await new SignJWT({
                  userId: userInfo.id,
                  email: userInfo.email,
                  role: userInfo.role
                })
                  .setProtectedHeader({ alg: "HS256" })
                  .setIssuedAt()
                  .setExpirationTime("7d")
                  .sign(JWT_SECRET);

                const response = NextResponse.json({
                  success: true,
                  user: {
                    id: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name,
                    role: userInfo.role,
                  },
                });

                // Set HTTP-only cookie
                response.cookies.set("auth-token", token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                  maxAge: 60 * 60 * 24 * 7, // 7 days
                  path: "/",
                });

                resolve(response);
              });
            } else {
              resolve(
                NextResponse.json(
                  { error: "Invalid code" },
                  { status: 401 }
                )
              );
            }
          } catch (err) {
            console.error("Failed to parse verify output:", err, stdout, stderr);
            resolve(
              NextResponse.json(
                { error: "Failed to verify code" },
                { status: 500 }
              )
            );
          }
        } else {
          resolve(
            NextResponse.json(
              { error: "Invalid code" },
              { status: 401 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error verifying 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
