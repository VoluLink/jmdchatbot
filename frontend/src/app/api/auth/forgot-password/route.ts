import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { normalizeEmail, generateId } from "@/lib/auth";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "E-Mail-Adresse erforderlich" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const userResult = await query(
      "SELECT id, name, email FROM users WHERE email = $1 AND is_active = true",
      [normalizedEmail]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json({
        message: "Wenn die E-Mail-Adresse existiert, wurde ein Reset-Link gesendet.",
      });
    }

    const user = userResult.rows[0];
    const token = randomBytes(32).toString("hex");
    const id = generateId("prt");

    const expiryMinutes = parseInt(
      process.env.PASSWORD_RESET_EXPIRY_MINUTES || "60",
      10
    );
    const expiresAt = new Date(
      Date.now() + expiryMinutes * 60 * 1000
    ).toISOString();
    const createdAt = new Date().toISOString();

    await query(
      `INSERT INTO password_reset_tokens
        (id, user_id, token, created_at, expires_at, used)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [id, user.id, token, createdAt, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const { html, text } = generatePasswordResetEmail(
      user.name,
      resetLink,
      expiryMinutes
    );

    try {
      await sendEmail({
        to: user.email,
        subject: "Passwort zuruecksetzen - JMDChatbot",
        html,
        text,
      });

      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);

      await query("DELETE FROM password_reset_tokens WHERE id = $1", [id]);

      return NextResponse.json(
        {
          error:
            "E-Mail konnte nicht gesendet werden. Bitte pruefen Sie die SMTP-Konfiguration.",
        },
        { status: 500 }
      );
    }

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
