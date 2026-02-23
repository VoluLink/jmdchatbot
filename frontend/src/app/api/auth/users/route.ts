import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { generateId, hashPassword, normalizeEmail } from "@/lib/auth";

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

const INVITE_EXPIRY_MINUTES = parseInt(
  process.env.INVITE_LINK_EXPIRY_MINUTES || "10080",
  10
);

async function createInviteLink(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenId = generateId("prt");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();

  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
  await query(
    `INSERT INTO password_reset_tokens
      (id, user_id, token, created_at, expires_at, used)
     VALUES ($1, $2, $3, $4, $5, false)`,
    [tokenId, userId, token, createdAt, expiresAt]
  );

  const frontendUrl = process.env.INVITE_FRONTEND_URL || process.env.FRONTEND_URL || "https://jmdchatbot.kjf-regensburg.de";
  return {
    inviteLink: `${frontendUrl}/reset-password?token=${token}`,
    expiresAt,
  };
}

// POST - Whitelist/invite user (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      role?: "admin" | "user";
    };

    const normalizedEmail = normalizeEmail(body.email || "");
    const name = (body.name || "").trim();
    const role = body.role === "admin" ? "admin" : "user";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await query<{
      id: string;
      role: "admin" | "user";
      is_active: boolean;
      must_change_password: boolean;
    }>(
      `SELECT id, role, is_active, must_change_password
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    let userId: string;

    if (existing.rowCount) {
      const user = existing.rows[0];
      userId = user.id;

      if (user.is_active && !user.must_change_password) {
        return NextResponse.json(
          { error: "User already active. Use password reset instead." },
          { status: 400 }
        );
      }

      await query(
        `UPDATE users
         SET name = $1,
             role = $2,
             is_active = true,
             must_change_password = true
         WHERE id = $3`,
        [name, role, userId]
      );
    } else {
      userId = generateId("user");
      const createdAt = new Date().toISOString();
      const tempPasswordHash = await hashPassword(randomBytes(24).toString("hex"));

      await query(
        `INSERT INTO users
          (id, email, name, password_hash, role, created_at, is_active, two_fa_enabled, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, true)`,
        [userId, normalizedEmail, name, tempPasswordHash, role, createdAt]
      );
    }

    const { inviteLink, expiresAt } = await createInviteLink(userId);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name,
        role,
      },
      inviteLink,
      expiresAt,
    });
  } catch (error) {
    console.error("Failed to invite user:", error);
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}

// GET - List all users (all authenticated users can view)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const userRole = verified.payload.role as string;
    const isAdmin = userRole === "admin";

    const result = await query(
      `SELECT id, name, email, role, created_at, last_login, must_change_password, two_fa_enabled, two_fa_required
       FROM users
       WHERE is_active = true
       ORDER BY created_at DESC`
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      // Only include sensitive fields for admins
      createdAt: isAdmin ? row.created_at : undefined,
      lastLogin: isAdmin ? row.last_login : undefined,
      invitePending: isAdmin ? !!row.must_change_password : undefined,
      twoFaEnabled: isAdmin ? !!row.two_fa_enabled : undefined,
      twoFaRequired: isAdmin ? !!row.two_fa_required : undefined,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list users:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

// PATCH - Update user role or 2FA requirement (admin only)
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      role?: "admin" | "user";
      twoFaRequired?: boolean;
    };

    const userId = (body.userId || "").trim();
    const role = body.role;
    const twoFaRequired = body.twoFaRequired;

    // Handle 2FA requirement toggle
    if (userId && twoFaRequired !== undefined) {
      await query(
        "UPDATE users SET two_fa_required = $1 WHERE id = $2",
        [twoFaRequired, userId]
      );
      return NextResponse.json({ success: true });
    }

    // Handle role update
    if (!userId || (role !== "admin" && role !== "user")) {
      return NextResponse.json(
        { error: "User ID and valid role are required" },
        { status: 400 }
      );
    }

    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const userResult = await query<{ id: string; role: "admin" | "user" }>(
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

    if (user.role === role) {
      return NextResponse.json({ success: true, unchanged: true });
    }

    if (user.role === "admin" && role === "user") {
      const adminCountResult = await query(
        "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND is_active = true"
      );
      const adminCount = adminCountResult.rows[0]?.count ?? 0;

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last admin" },
          { status: 400 }
        );
      }
    }

    await query("UPDATE users SET role = $1 WHERE id = $2", [role, userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
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

