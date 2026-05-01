import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export const PASSWORD_MIN_LENGTH = 6;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(6).toString("hex")}`;
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generateNumericCode(length = 6): string {
  let code = "";
  while (code.length < length) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

const BACKUP_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBackupCodeRaw(): string {
  let raw = "";
  for (let i = 0; i < 12; i += 1) {
    const index = Math.floor(Math.random() * BACKUP_CODE_CHARS.length);
    raw += BACKUP_CODE_CHARS[index];
  }
  return raw;
}

export function formatBackupCode(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/-/g, "").trim().toUpperCase();
}

export async function generateBackupCodes(
  count = 8
): Promise<{ plainCodes: string[]; hashedCodes: string[] }> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const raw = randomBackupCodeRaw();
    plainCodes.push(formatBackupCode(raw));
    hashedCodes.push(await bcrypt.hash(raw, 10));
  }
  return { plainCodes, hashedCodes };
}

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const visible = digits.slice(-2);
  const masked = "*".repeat(Math.max(0, digits.length - 2)) + visible;
  return masked;
}
