import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// GET - Get current user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload;

    const result = await query(
      "SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true",
      [payload.userId]
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
