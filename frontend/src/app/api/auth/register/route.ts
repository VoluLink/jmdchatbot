import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import {
  generateId,
  hashPassword,
  normalizeEmail,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

async function isAdmin(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return false;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.role === "admin";
  } catch {
    return false;
  }
}

// POST - Register new user
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: "Selbstregistrierung ist deaktiviert. Bitte nutze einen Einladungslink." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const desiredRole = role === "admin" ? "admin" : "user";

    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rowCount) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const userId = generateId("user");
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    await query(
      `INSERT INTO users
        (id, email, name, password_hash, role, created_at, is_active, two_fa_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, true, false)`,
      [userId, normalizedEmail, name, passwordHash, desiredRole, createdAt]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name,
        role: desiredRole,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
