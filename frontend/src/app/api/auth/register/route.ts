import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// POST - Register new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Call Python script to register user
    return new Promise((resolve) => {
      const pythonProcess = spawn(
        "python",
        [
          "-m",
          "src.auth.register_user",
          email,
          password,
          name,
        ],
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

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(NextResponse.json(result));
          } catch {
            resolve(
              NextResponse.json({
                success: true,
                message: "User registered successfully",
              })
            );
          }
        } else {
          resolve(
            NextResponse.json(
              { error: stderr || "Registration failed" },
              { status: 400 }
            )
          );
        }
      });
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}

