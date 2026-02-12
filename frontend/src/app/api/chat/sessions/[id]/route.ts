import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_auth";
import {
  type ChatMessage,
  deleteSessionForUser,
  updateSessionMessagesForUser,
} from "../../_storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidChatMessage(msg: unknown): msg is ChatMessage {
  if (!msg || typeof msg !== "object") return false;
  const maybe = msg as Record<string, unknown>;
  return (
    (maybe.role === "user" || maybe.role === "assistant") &&
    typeof maybe.content === "string"
  );
}

// PATCH - Update messages/title for a session owned by the current user
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getAuthenticatedUser(request);
  if (!auth?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { messages } = body as { messages?: unknown };

    if (!Array.isArray(messages) || !messages.every(isValidChatMessage)) {
      return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
    }

    const session = await updateSessionMessagesForUser(auth.userId, id, messages);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to update chat session:", error);
    return NextResponse.json({ error: "Failed to update chat session" }, { status: 500 });
  }
}

// DELETE - Delete a session owned by the current user
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await getAuthenticatedUser(request);
  if (!auth?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const deleted = await deleteSessionForUser(auth.userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat session:", error);
    return NextResponse.json({ error: "Failed to delete chat session" }, { status: 500 });
  }
}

