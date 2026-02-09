import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    if (verified.payload.role !== "admin") {
      return null;
    }
    return verified.payload;
  } catch {
    return null;
  }
}

// POST - Admin resets a user's password
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Check if user exists
    const userResult = await query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Hash new password and set must_change_password flag
    const passwordHash = await hashPassword(newPassword);
    await query(
      "UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2",
      [passwordHash, userId]
    );

    console.log(`Admin ${admin.email} reset password for user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
