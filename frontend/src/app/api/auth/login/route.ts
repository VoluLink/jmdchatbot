import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Login user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Call Python script to verify user
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        ["-m", "src.auth.verify_user", email, password],
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
            const user = JSON.parse(stdout);

            // Check if 2FA is enabled
            if (user.twoFaEnabled) {
              // Create pending 2FA session and send verification code
              const createSessionProcess = spawn(
                "python",
                ["-c", `
import sys
import json
from src.auth.two_fa_manager import create_pending_session, send_verification_code, mask_phone_number

user_id = sys.argv[1]
session_token = create_pending_session(user_id, expiry_minutes=15)
send_result = send_verification_code(user_id, "login")

# Get masked phone number
from src.auth.user_manager import find_user_by_id
user_data = find_user_by_id(user_id)
phone_masked = mask_phone_number(user_data.get("phoneNumber", "")) if user_data else ""

print(json.dumps({
    "session_token": session_token,
    "phone_masked": phone_masked,
    "send_success": send_result.get("success", False)
}))
                `.trim(), user.id],
                {
                  cwd: path.join(process.cwd(), ".."),
                }
              );

              let sessionStdout = "";

              createSessionProcess.stdout?.on("data", (data) => {
                sessionStdout += data.toString();
              });

              createSessionProcess.on("close", (sessionCode) => {
                if (sessionCode === 0) {
                  try {
                    const sessionData = JSON.parse(sessionStdout);

                    resolve(
                      NextResponse.json({
                        requiresTwoFa: true,
                        sessionToken: sessionData.session_token,
                        phoneNumberMasked: sessionData.phone_masked,
                      })
                    );
                  } catch {
                    resolve(
                      NextResponse.json(
                        { error: "Failed to initiate 2FA" },
                        { status: 500 }
                      )
                    );
                  }
                } else {
                  resolve(
                    NextResponse.json(
                      { error: "Failed to initiate 2FA" },
                      { status: 500 }
                    )
                  );
                }
              });
            } else {
              // No 2FA - proceed with regular login
              // Create JWT token
              const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("7d")
                .sign(JWT_SECRET);

              const response = NextResponse.json({
                success: true,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
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
            }
          } catch {
            resolve(
              NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
              )
            );
          }
        } else {
          resolve(
            NextResponse.json(
              { error: "Invalid credentials" },
              { status: 401 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    );
  }
}

