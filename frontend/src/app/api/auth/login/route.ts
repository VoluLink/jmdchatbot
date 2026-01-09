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

