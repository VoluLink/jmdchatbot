import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { query } from "@/lib/db";
import {
  generateId,
  generateToken,
  normalizeEmail,
  verifyPassword,
  maskPhoneNumber,
} from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const SESSION_EXPIRY_MINUTES = parseInt(
  process.env.TWO_FA_SESSION_EXPIRY_MINUTES || "15",
  10
);

// POST - Login user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    const result = await query(
      `SELECT id, email, name, role, password_hash, two_fa_enabled, phone_number, must_change_password
       FROM users
       WHERE email = $1 AND is_active = true`,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const passwordOk = await verifyPassword(password, user.password_hash);

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.two_fa_enabled) {
      const sessionToken = generateToken(32);
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000
      ).toISOString();

      await query(
        `INSERT INTO two_fa_pending_sessions
          (id, user_id, token, purpose, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          generateId("session"),
          user.id,
          sessionToken,
          "login",
          createdAt,
          expiresAt,
        ]
      );

      return NextResponse.json({
        requiresTwoFa: true,
        sessionToken,
        phoneNumberMasked: maskPhoneNumber(user.phone_number || ""),
      });
    }

    await query(
      "UPDATE users SET last_login = $1 WHERE id = $2",
      [new Date().toISOString(), user.id]
    );

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      mustChangePassword: !!user.must_change_password,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    );
  }
}
