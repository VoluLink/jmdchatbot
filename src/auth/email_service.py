"""
Email service for sending verification codes and password reset emails.
Uses Gmail SMTP for reliable, free email delivery.
"""

import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

from src.config.settings import get_settings


def send_verification_email(to_email: str, code: str, purpose: str = "login") -> bool:
    """
    Send a verification code via email.

    Args:
        to_email: Recipient email address
        code: 6-digit verification code
        purpose: Purpose of the verification ('login', 'setup', 'verification')

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    settings = get_settings()

    # Check if email is configured
    if not settings.smtp_username or not settings.smtp_password:
        print("[EMAIL] ⚠️  Email not configured. Using mock mode.")
        return send_verification_email_mock(to_email, code, purpose)

    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = _get_email_subject(purpose)
        msg['From'] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg['To'] = to_email

        # Create HTML and plain text versions
        text_content = _get_email_text_content(code, purpose)
        html_content = _get_email_html_content(code, purpose)

        # Attach both versions
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)

        print(f"[EMAIL] ✓ Verification code sent to {to_email}")
        return True

    except Exception as e:
        print(f"[EMAIL] ✗ Failed to send email to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, user_name: str, reset_token: str) -> bool:
    """
    Send a password reset link via email.

    Args:
        to_email: Recipient email address
        user_name: Name of the user
        reset_token: Password reset token

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    settings = get_settings()

    # Check if email is configured
    if not settings.smtp_username or not settings.smtp_password:
        print("[EMAIL] ⚠️  Email not configured. Using mock mode.")
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
        print(f"[EMAIL MOCK] Password reset link: {reset_url}")
        return True

    try:
        # Create reset URL
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Passwort zurücksetzen - RAG Assistant"
        msg['From'] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg['To'] = to_email

        # Create HTML and plain text versions
        text_content = f"""Hallo {user_name},

Sie haben eine Passwort-Zurücksetzung angefordert.

Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:
{reset_url}

Dieser Link ist {settings.password_reset_expiry_minutes} Minuten gültig.

Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.

Mit freundlichen Grüßen,
RAG Assistant Team
"""

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">🔐 Passwort zurücksetzen</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.5;">
                                Hallo <strong>{user_name}</strong>,
                            </p>
                            <p style="margin: 0 0 30px; color: #666666; font-size: 14px; line-height: 1.5;">
                                Sie haben eine Passwort-Zurücksetzung angefordert. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort festzulegen.
                            </p>

                            <!-- Button -->
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td style="text-align: center; padding: 20px 0;">
                                        <a href="{reset_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                            Passwort zurücksetzen
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 20px; color: #666666; font-size: 13px; line-height: 1.5;">
                                Oder kopieren Sie diesen Link in Ihren Browser:
                            </p>
                            <p style="margin: 0 0 30px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; color: #667eea; font-size: 12px; word-break: break-all; font-family: monospace;">
                                {reset_url}
                            </p>

                            <div style="padding: 20px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                                    ⏱️ Dieser Link ist <strong>{settings.password_reset_expiry_minutes} Minuten</strong> gültig.
                                </p>
                            </div>

                            <p style="margin: 20px 0 0; color: #999999; font-size: 13px; line-height: 1.5;">
                                Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                Mit freundlichen Grüßen,<br>
                                <strong>RAG Assistant Team</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        # Attach both versions
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)

        print(f"[EMAIL] ✓ Password reset email sent to {to_email}")
        return True

    except Exception as e:
        print(f"[EMAIL] ✗ Failed to send password reset email to {to_email}: {e}")
        return False


def send_verification_email_mock(to_email: str, code: str, purpose: str) -> bool:
    """
    Mock email sending for development/testing.
    Prints the code to console instead of sending email.
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"\n{'='*60}")
    print(f"[EMAIL MOCK {timestamp}] 📧")
    print(f"To: {to_email}")
    print(f"Subject: {_get_email_subject(purpose)}")
    print(f"")
    print(f"  Verification Code: {code}")
    print(f"  Purpose: {purpose}")
    print(f"{'='*60}\n")
    return True


def _get_email_subject(purpose: str) -> str:
    """Get email subject based on purpose."""
    subjects = {
        'login': 'Ihr Anmeldecode - RAG Assistant',
        'setup': 'Aktivieren Sie die Zwei-Faktor-Authentifizierung',
        'verification': 'Ihr Verifizierungscode - RAG Assistant'
    }
    return subjects.get(purpose, 'Ihr Verifizierungscode')


def _get_email_text_content(code: str, purpose: str) -> str:
    """Get plain text email content."""
    return f"""Ihr Verifizierungscode lautet:

{code}

Dieser Code ist 10 Minuten gültig.

Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.

Mit freundlichen Grüßen,
RAG Assistant Team
"""


def _get_email_html_content(code: str, purpose: str) -> str:
    """Get HTML email content."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">🔐 Verifizierungscode</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 30px; color: #666666; font-size: 14px; line-height: 1.5; text-align: center;">
                                Verwenden Sie diesen Code, um fortzufahren:
                            </p>

                            <!-- Code Box -->
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                    <span style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                        {code}
                                    </span>
                                </div>
                            </div>

                            <div style="padding: 20px; background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px; margin: 30px 0;">
                                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                                    ⏱️ Dieser Code ist <strong>10 Minuten</strong> gültig.
                                </p>
                            </div>

                            <p style="margin: 20px 0 0; color: #999999; font-size: 13px; line-height: 1.5; text-align: center;">
                                Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                Mit freundlichen Grüßen,<br>
                                <strong>RAG Assistant Team</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
