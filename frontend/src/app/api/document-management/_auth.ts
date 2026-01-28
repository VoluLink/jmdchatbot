import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

export async function verifyAdmin(request: NextRequest) {
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

    return { authorized: true, userId: payload.userId };
  } catch (error) {
    return { authorized: false, error: "Invalid token" };
  }
}
