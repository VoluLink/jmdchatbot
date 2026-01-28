import { NextRequest, NextResponse } from "next/server";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { randomBytes } from "crypto";
import path from "path";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";

const DB_PATH = path.join(process.cwd(), "..", "data", "auth.db");

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "E-Mail-Adresse erforderlich" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find user by email
    const user = await db.get(
      "SELECT id, name, email FROM users WHERE email = ? AND is_active = 1",
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    // (Don't reveal if email exists or not)
    if (!user) {
      await db.close();
      return NextResponse.json({
        message: "Wenn die E-Mail-Adresse existiert, wurde ein Reset-Link gesendet.",
      });
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const id = randomBytes(16).toString("hex");

    // Token expires in 60 minutes (configurable)
    const expiryMinutes = parseInt(
      process.env.PASSWORD_RESET_EXPIRY_MINUTES || "60",
      10
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    // Save token to database
    await db.run(
      `INSERT INTO password_reset_tokens (id, user_id, token, created_at, expires_at, used)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, user.id, token, createdAt, expiresAt]
    );

    // Generate reset link
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Generate email content
    const { html, text } = generatePasswordResetEmail(
      user.name,
      resetLink,
      expiryMinutes
    );

    // Send email
    try {
      await sendEmail({
        to: user.email,
        subject: "Passwort zurücksetzen - AMIKO",
        html,
        text,
      });

      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);

      // Delete the token if email fails
      await db.run("DELETE FROM password_reset_tokens WHERE id = ?", [id]);
      await db.close();

      return NextResponse.json(
        {
          error:
            "E-Mail konnte nicht gesendet werden. Bitte prüfen Sie die SMTP-Konfiguration.",
        },
        { status: 500 }
      );
    }

    await db.close();

    return NextResponse.json({
      message: "Wenn die E-Mail-Adresse existiert, wurde ein Reset-Link gesendet.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
