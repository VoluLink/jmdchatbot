import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// GET - Get 2FA status for authenticated user
export async function GET(request: NextRequest) {
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

    const userResult = await query(
      "SELECT two_fa_enabled, two_fa_enrolled_at FROM users WHERE id = $1",
      [userId]
    );

    if (!userResult.rowCount) {
      return NextResponse.json(
        { error: "Failed to get 2FA status" },
        { status: 500 }
      );
    }

    const backupResult = await query(
      "SELECT COUNT(*)::int AS count FROM two_fa_backup_codes WHERE user_id = $1 AND used = false",
      [userId]
    );

    return NextResponse.json({
      enabled: userResult.rows[0].two_fa_enabled,
      enrolledAt: userResult.rows[0].two_fa_enrolled_at,
      backupCodesRemaining: backupResult.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Error getting 2FA status:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}
