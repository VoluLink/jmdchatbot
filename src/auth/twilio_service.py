"""Twilio SMS service for sending verification codes."""

import os
from typing import Optional
import phonenumbers
from phonenumbers import NumberParseException


# Twilio client will be initialized lazily when needed
_twilio_client = None


def get_twilio_client():
    """Get or create Twilio client."""
    global _twilio_client

    if _twilio_client is None:
        try:
            from twilio.rest import Client

            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")

            if not account_sid or not auth_token:
                raise ValueError(
                    "Twilio credentials not configured. "
                    "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env"
                )

            _twilio_client = Client(account_sid, auth_token)
        except ImportError:
            raise ImportError(
                "Twilio package not installed. Run: pip install twilio>=8.10.0"
            )

    return _twilio_client


def format_phone_e164(phone: str, country_code: str = "+49") -> str:
    """
    Format phone number to E.164 format.

    Args:
        phone: Phone number (can include country code or not)
        country_code: Default country code if phone doesn't have one

    Returns:
        E.164 formatted phone number (e.g., "+491234567890")

    Raises:
        NumberParseException: If phone number is invalid
    """
    try:
        # If phone already starts with +, parse it directly
        if phone.startswith("+"):
            parsed = phonenumbers.parse(phone, None)
        else:
            # Otherwise, use the provided country code
            # Extract country from country code (e.g., "+49" -> "DE")
            region = phonenumbers.region_code_for_country_code(
                int(country_code.replace("+", ""))
            )
            parsed = phonenumbers.parse(phone, region)

        # Validate the number
        if not phonenumbers.is_valid_number(parsed):
            raise NumberParseException(
                NumberParseException.INVALID_COUNTRY_CODE,
                "Invalid phone number"
            )

        # Return in E.164 format
        return phonenumbers.format_number(
            parsed, phonenumbers.PhoneNumberFormat.E164
        )
    except NumberParseException as e:
        raise ValueError(f"Invalid phone number: {e}")


def validate_phone_number(phone: str, country_code: str = "+49") -> bool:
    """
    Validate if a phone number is valid.

    Args:
        phone: Phone number to validate
        country_code: Country code for the phone number

    Returns:
        True if valid, False otherwise
    """
    try:
        format_phone_e164(phone, country_code)
        return True
    except (ValueError, NumberParseException):
        return False


def mask_phone_number(phone: str) -> str:
    """
    Mask a phone number for display.

    Args:
        phone: Phone number in E.164 format (e.g., "+491234567890")

    Returns:
        Masked phone number (e.g., "+49 *** *** **90")
    """
    if not phone or len(phone) < 6:
        return phone

    # Keep country code and last 2 digits
    if phone.startswith("+"):
        # Find where country code ends (varies by country)
        try:
            parsed = phonenumbers.parse(phone, None)
            country_code = f"+{parsed.country_code}"
            national_number = str(parsed.national_number)

            # Mask the national number, keeping last 2 digits
            if len(national_number) > 2:
                masked_national = "*** *** **" + national_number[-2:]
            else:
                masked_national = national_number

            return f"{country_code} {masked_national}"
        except:
            # Fallback: simple masking
            pass

    # Simple fallback masking
    return phone[:3] + " *** *** **" + phone[-2:]


def send_verification_sms(phone_number: str, code: str) -> dict:
    """
    Send a verification code via SMS using Twilio.

    Args:
        phone_number: Phone number in E.164 format (e.g., "+491234567890")
        code: Verification code to send (6-digit string)

    Returns:
        dict with keys:
            - success: bool
            - message_sid: str (if successful)
            - error: str (if failed)

    Raises:
        ValueError: If phone number is invalid
    """
    # Validate phone number format
    if not phone_number.startswith("+"):
        raise ValueError("Phone number must be in E.164 format (e.g., +491234567890)")

    try:
        client = get_twilio_client()
        from_number = os.getenv("TWILIO_PHONE_NUMBER")

        if not from_number:
            raise ValueError(
                "TWILIO_PHONE_NUMBER not configured. Set it in .env"
            )

        # Construct message
        message_body = f"Your verification code is: {code}\n\nThis code will expire in 10 minutes."

        # Send SMS
        message = client.messages.create(
            body=message_body,
            from_=from_number,
            to=phone_number
        )

        print(f"✓ SMS sent to {mask_phone_number(phone_number)} (SID: {message.sid})")

        return {
            "success": True,
            "message_sid": message.sid,
        }

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Failed to send SMS to {mask_phone_number(phone_number)}: {error_msg}")

        return {
            "success": False,
            "error": error_msg,
        }


# Mock mode for development (logs code instead of sending SMS)
def send_verification_sms_mock(phone_number: str, code: str) -> dict:
    """
    Mock SMS sending for development (logs to console instead of sending).

    Args:
        phone_number: Phone number in E.164 format
        code: Verification code to send

    Returns:
        dict with success=True and mock message_sid
    """
    masked = mask_phone_number(phone_number)
    print("=" * 60)
    print(f"📱 MOCK SMS (not sent via Twilio)")
    print(f"To: {masked}")
    print(f"Code: {code}")
    print("=" * 60)

    return {
        "success": True,
        "message_sid": "MOCK_" + code,
    }


def get_send_function():
    """
    Get the appropriate SMS send function based on environment.

    Returns:
        send_verification_sms or send_verification_sms_mock
    """
    use_mock = os.getenv("TWILIO_MOCK_MODE", "false").lower() == "true"

    if use_mock:
        return send_verification_sms_mock
    else:
        return send_verification_sms
