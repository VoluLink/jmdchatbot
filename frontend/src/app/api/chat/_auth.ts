import { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

type AuthPayload = JWTPayload & {
  userId?: string;
  role?: "admin" | "user";
};

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthPayload | null> {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as AuthPayload;
    if (!payload.userId || typeof payload.userId !== "string") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

