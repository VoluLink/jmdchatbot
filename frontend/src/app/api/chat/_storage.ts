import { generateId } from "@/lib/auth";
import { query } from "@/lib/db";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  id?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

type ChatSessionRow = Record<string, any> & {
  id: string;
  title: string;
  messages_json: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const globalForChatSchema = globalThis as typeof globalThis & {
  __chatSchemaInitialized?: boolean;
};

function toMillis(value: string | null | undefined): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((msg) => msg.role === "user");
  if (!firstUserMsg || !firstUserMsg.content?.trim()) {
    return "Neue Unterhaltung";
  }
  const trimmed = firstUserMsg.content.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

function parseMessages(raw: string | null | undefined): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (msg): msg is ChatMessage =>
        !!msg &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string"
    );
  } catch {
    return [];
  }
}

function mapRow(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title || "Neue Unterhaltung",
    messages: parseMessages(row.messages_json),
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

export async function ensureChatSchema(): Promise<void> {
  if (globalForChatSchema.__chatSchemaInitialized) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      messages_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
      ON chat_sessions(user_id, updated_at)
  `);

  globalForChatSchema.__chatSchemaInitialized = true;
}

export async function listSessionsForUser(userId: string): Promise<ChatSession[]> {
  await ensureChatSchema();

  const result = await query<ChatSessionRow>(
    `SELECT id, title, messages_json, created_at, updated_at
     FROM chat_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );

  return result.rows.map(mapRow);
}

export async function createSessionForUser(userId: string): Promise<ChatSession> {
  await ensureChatSchema();

  const now = new Date().toISOString();
  const id = generateId("chat");
  const title = "Neue Unterhaltung";

  await query(
    `INSERT INTO chat_sessions (id, user_id, title, messages_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, title, "[]", now, now]
  );

  return {
    id,
    title,
    messages: [],
    createdAt: Date.parse(now),
    updatedAt: Date.parse(now),
  };
}

export async function updateSessionMessagesForUser(
  userId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<ChatSession | null> {
  await ensureChatSchema();

  const updatedAt = new Date().toISOString();
  const title = deriveTitle(messages);
  const messagesJson = JSON.stringify(messages);

  const updateResult = await query(
    `UPDATE chat_sessions
     SET title = $1, messages_json = $2, updated_at = $3
     WHERE id = $4 AND user_id = $5`,
    [title, messagesJson, updatedAt, sessionId, userId]
  );

  if (updateResult.rowCount === 0) {
    return null;
  }

  const result = await query<ChatSessionRow>(
    `SELECT id, title, messages_json, created_at, updated_at
     FROM chat_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function deleteSessionForUser(userId: string, sessionId: string): Promise<boolean> {
  await ensureChatSchema();

  const result = await query(
    `DELETE FROM chat_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}
