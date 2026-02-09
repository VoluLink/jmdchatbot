import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch {
    return null;
  }
}

// POST - Change own password
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Get current user
    const userResult = await query(
      "SELECT id, password_hash, must_change_password FROM users WHERE id = $1",
      [authUser.userId]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // If not a forced password change, verify current password
    if (!user.must_change_password) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }

      const passwordOk = await verifyPassword(currentPassword, user.password_hash);
      if (!passwordOk) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    // Hash new password and clear the must_change_password flag
    const passwordHash = await hashPassword(newPassword);
    await query(
      "UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2",
      [passwordHash, user.id]
    );

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
