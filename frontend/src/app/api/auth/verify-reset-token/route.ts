import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token erforderlich" },
        { status: 400 }
      );
    }

    const tokenResult = await query(
      `SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used,
        u.email,
        u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND u.is_active = true`,
      [token]
    );

    if (!tokenResult.rowCount) {
      return NextResponse.json(
        { error: "Ungueltiges oder abgelaufenes Token" },
        { status: 400 }
      );
    }

    const tokenData = tokenResult.rows[0];

    if (tokenData.used) {
      return NextResponse.json(
        { error: "Dieses Token wurde bereits verwendet" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Dieses Token ist abgelaufen" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: tokenData.email,
      valid: true,
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
