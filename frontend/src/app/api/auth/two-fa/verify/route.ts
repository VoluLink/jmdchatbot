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

// POST - Verify 2FA code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionToken, code, purpose } = body;

    if (!code || !purpose) {
      return NextResponse.json(
        { error: "Code and purpose are required" },
        { status: 400 }
      );
    }

    // For login flow, we need sessionToken. For setup/verification, we need userId
    let verifyUserId = userId;
    let userInfo = null;

    if (purpose === "login" && sessionToken) {
      // Verify pending session and get user info
      try {
        userInfo = await verifyPendingSession(sessionToken);
        verifyUserId = userInfo.id;
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }
    }

    if (!verifyUserId) {
      return NextResponse.json(
        { error: "User ID or session token is required" },
        { status: 400 }
      );
    }

    // Call Python script to verify code
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-m", "src.auth.two_fa_verify_code", verifyUserId, code, purpose],
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
              // If this is a login verification, create JWT and set cookie
              if (purpose === "login" && userInfo && sessionToken) {
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
                // For non-login verifications, just return success
                resolve(
                  NextResponse.json({
                    success: true,
                  })
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
          } catch {
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
