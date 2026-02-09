import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateId, generateNumericCode } from "@/lib/auth";

const CODE_EXPIRY_MINUTES = parseInt(
  process.env.TWO_FA_CODE_EXPIRY_MINUTES || "10",
  10
);

// POST - Send 2FA verification code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, purpose } = body;

    if (!userId || !purpose) {
      return NextResponse.json(
        { error: "User ID and purpose are required" },
        { status: 400 }
      );
    }

    const validPurposes = ["login", "setup", "verification"];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid purpose" },
        { status: 400 }
      );
    }

    const code = generateNumericCode(6);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    await query(
      `INSERT INTO two_fa_verification_codes
        (id, user_id, code, purpose, created_at, expires_at, used)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [generateId("vcode"), userId, code, purpose, createdAt, expiresAt]
    );

    if (process.env.TWILIO_MOCK_MODE === "true") {
      console.log(`2FA code for ${userId} (${purpose}): ${code}`);
    } else {
      console.log("TWILIO integration not configured in this build");
    }

    return NextResponse.json({
      success: true,
      expiresIn: CODE_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error("Error sending 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 500 }
    );
  }
}
