import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Enable 2FA for authenticated user
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

    const body = await request.json();
    const { phoneNumber, countryCode, verificationCode } = body;

    if (!phoneNumber || !verificationCode) {
      return NextResponse.json(
        { error: "Phone number and verification code are required" },
        { status: 400 }
      );
    }

    // First, verify the verification code
    return new Promise((resolve) => {
      const verifyProcess = spawn(
        "python",
        ["-m", "src.auth.two_fa_verify_code", userId, verificationCode, "setup"],
        {
          cwd: path.join(process.cwd(), ".."),
        }
      );

      let verifyStdout = "";

      verifyProcess.stdout?.on("data", (data) => {
        verifyStdout += data.toString();
      });

      verifyProcess.on("close", (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              { error: "Invalid verification code" },
              { status: 401 }
            )
          );
          return;
        }

        try {
          const verifyResult = JSON.parse(verifyStdout);
          if (!verifyResult.success) {
            resolve(
              NextResponse.json(
                { error: "Invalid verification code" },
                { status: 401 }
              )
            );
            return;
          }
        } catch {
          resolve(
            NextResponse.json(
              { error: "Failed to verify code" },
              { status: 500 }
            )
          );
          return;
        }

        // Code is valid, now enable 2FA
        const enableProcess = spawn(
          "python",
          ["-m", "src.auth.two_fa_enable", userId, phoneNumber, countryCode || "+49"],
          {
            cwd: path.join(process.cwd(), ".."),
          }
        );

        let enableStdout = "";

        enableProcess.stdout?.on("data", (data) => {
          enableStdout += data.toString();
        });

        enableProcess.on("close", (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(enableStdout);

              if (result.success) {
                resolve(
                  NextResponse.json({
                    success: true,
                    backupCodes: result.backup_codes,
                    phoneNumberMasked: result.phone_masked,
                  })
                );
              } else {
                resolve(
                  NextResponse.json(
                    { error: result.error || "Failed to enable 2FA" },
                    { status: 400 }
                  )
                );
              }
            } catch {
              resolve(
                NextResponse.json(
                  { error: "Failed to enable 2FA" },
                  { status: 500 }
                )
              );
            }
          } else {
            resolve(
              NextResponse.json(
                { error: "Failed to enable 2FA" },
                { status: 500 }
              )
            );
          }
        });
      });
    });
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    return NextResponse.json(
      { error: "Failed to enable 2FA" },
      { status: 500 }
    );
  }
}
