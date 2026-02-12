import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../_auth";
import { createSessionForUser, listSessionsForUser } from "../_storage";

export const dynamic = "force-dynamic";

// GET - List current user's chat sessions
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const sessions = await listSessionsForUser(auth.userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to load chat sessions:", error);
    return NextResponse.json({ error: "Failed to load chat sessions" }, { status: 500 });
  }
}

// POST - Create a new empty chat session for the current user
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const session = await createSessionForUser(auth.userId);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return NextResponse.json({ error: "Failed to create chat session" }, { status: 500 });
  }
}

