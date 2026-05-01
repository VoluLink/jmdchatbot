import { authenticator } from "otplib";
import qrcode from "qrcode";

const issuer =
  process.env.TWO_FA_ISSUER || process.env.APP_NAME || "JMDChatbot";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, issuer, secret);
}

export async function generateQrCodeBase64(otpauth: string): Promise<string> {
  const dataUrl = await qrcode.toDataURL(otpauth);
  return dataUrl.split(",")[1] || "";
}

export function verifyTotp(code: string, secret: string): boolean {
  return authenticator.verify({ token: code, secret });
}
