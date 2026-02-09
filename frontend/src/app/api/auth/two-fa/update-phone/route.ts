import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { maskPhoneNumber } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Update phone number for authenticated user
export async function POST(request: NextRequest) {
  try {
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

    const codeResult = await query(
      `SELECT id, expires_at, used
       FROM two_fa_verification_codes
       WHERE user_id = $1 AND code = $2 AND purpose = 'verification'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, verificationCode]
    );

    if (!codeResult.rowCount) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    const codeRow = codeResult.rows[0];

    if (codeRow.used) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    if (new Date() > new Date(codeRow.expires_at)) {
      return NextResponse.json(
        { error: "Verification code expired" },
        { status: 401 }
      );
    }

    await query(
      "UPDATE users SET phone_number = $1, country_code = $2 WHERE id = $3",
      [phoneNumber, countryCode || "+49", userId]
    );

    await query(
      "UPDATE two_fa_verification_codes SET used = true WHERE id = $1",
      [codeRow.id]
    );

    return NextResponse.json({
      success: true,
      phoneNumberMasked: maskPhoneNumber(phoneNumber),
    });
  } catch (error) {
    console.error("Error updating phone number:", error);
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    );
  }
}
