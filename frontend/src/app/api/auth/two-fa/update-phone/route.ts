import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Update phone number for authenticated user
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

    // First, verify the verification code sent to new phone
    return new Promise((resolve) => {
      const verifyProcess = spawn(
        "python",
        ["-m", "src.auth.two_fa_verify_code", userId, verificationCode, "verification"],
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

        // Code is valid, now update phone number
        const updateProcess = spawn(
          "python",
          ["-c", `
import sys
import json
from src.auth.two_fa_manager import update_phone_number

user_id = sys.argv[1]
phone_number = sys.argv[2]
country_code = sys.argv[3] if len(sys.argv) > 3 else "+49"

try:
    result = update_phone_number(user_id, phone_number, country_code)
    print(json.dumps(result))
except ValueError as e:
    print(json.dumps({"success": False, "error": str(e)}))
          `.trim(), userId, phoneNumber, countryCode || "+49"],
          {
            cwd: path.join(process.cwd(), ".."),
          }
        );

        let updateStdout = "";

        updateProcess.stdout?.on("data", (data) => {
          updateStdout += data.toString();
        });

        updateProcess.on("close", (code) => {
          try {
            const result = JSON.parse(updateStdout);

            if (result.success) {
              resolve(
                NextResponse.json({
                  success: true,
                  phoneNumberMasked: result.phone_masked,
                })
              );
            } else {
              resolve(
                NextResponse.json(
                  { error: result.error || "Failed to update phone number" },
                  { status: 400 }
                )
              );
            }
          } catch {
            resolve(
              NextResponse.json(
                { error: "Failed to update phone number" },
                { status: 500 }
              )
            );
          }
        });
      });
    });
  } catch (error) {
    console.error("Error updating phone number:", error);
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    );
  }
}
