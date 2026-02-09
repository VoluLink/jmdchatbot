import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { generateTotpSecret, buildOtpAuthUri, generateQrCodeBase64 } from "@/lib/twofa";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// POST - Setup TOTP 2FA (generate QR code)
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
    const userEmail = verified.payload.email as string;

    const secret = generateTotpSecret();
    const otpAuth = buildOtpAuthUri(userEmail, secret);
    const qrCodeBase64 = await generateQrCodeBase64(otpAuth);

    await query(
      "UPDATE users SET totp_secret = $1, two_fa_enabled = false WHERE id = $2",
      [secret, userId]
    );

    await query(
      "DELETE FROM two_fa_backup_codes WHERE user_id = $1",
      [userId]
    );

    const manualEntryKey = secret.match(/.{1,4}/g)?.join(" ") || secret;

    return NextResponse.json({
      success: true,
      qrCodeBase64,
      manualEntryKey,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
