import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// Helper function to verify admin role
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return { authorized: false, error: "Not authenticated" };
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload;

    if (payload.role !== "admin") {
      return { authorized: false, error: "Admin access required" };
    }

    return { authorized: true, userId: payload.userId as string };
  } catch {
    return { authorized: false, error: "Invalid token" };
  }
}

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const result = await query(
      `SELECT id, name, email, role, created_at, last_login
       FROM users
       WHERE is_active = true
       ORDER BY created_at DESC`
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      lastLogin: row.last_login,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list users:", error);
    return NextResponse.json({ users: [] });
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    const userResult = await query(
      "SELECT id, role FROM users WHERE id = $1 AND is_active = true",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (user.role === "admin") {
      const adminCountResult = await query(
        "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND is_active = true"
      );
      const adminCount = adminCountResult.rows[0]?.count ?? 0;

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin" },
          { status: 400 }
        );
      }
    }

    await query("UPDATE users SET is_active = false WHERE id = $1", [userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
