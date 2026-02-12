"use client";

import { useState, useEffect, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  id?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

type SessionsResponse = {
  sessions?: ChatSession[];
};

type SessionResponse = {
  session?: ChatSession;
};

export function useChatHistory(userId: string | null, authReady: boolean) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!userId) {
      setSessions([]);
      setCurrentSessionId(null);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    const loadSessions = async () => {
      setIsLoaded(false);
      try {
        const res = await fetch("/api/chat/sessions", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load sessions (${res.status})`);
        }

        const data = (await res.json().catch(() => ({}))) as SessionsResponse;
        const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];

        if (cancelled) return;

        setSessions(nextSessions);
        setCurrentSessionId((prev) => {
          if (prev && nextSessions.some((session) => session.id === prev)) {
            return prev;
          }
          return nextSessions[0]?.id ?? null;
        });
      } catch (e) {
        console.error("Failed to load chat history", e);
        if (cancelled) return;
        setSessions([]);
        setCurrentSessionId(null);
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  const createSession = useCallback(async () => {
    if (!userId) {
      return null;
    }

    // Check if there's already an empty session
    const existingEmptySession = sessions.find((s) => s.messages.length === 0);
    if (existingEmptySession) {
      setCurrentSessionId(existingEmptySession.id);
      return existingEmptySession;
    }

    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to create session (${res.status})`);
      }

      const data = (await res.json().catch(() => ({}))) as SessionResponse;
      if (!data.session) {
        throw new Error("Invalid create-session response");
      }

      setSessions((prev) => [data.session as ChatSession, ...prev]);
      setCurrentSessionId(data.session.id);
      return data.session as ChatSession;
    } catch (e) {
      console.error("Failed to create chat session", e);
      return null;
    }
  }, [sessions, userId]);

  const updateSession = useCallback(
    (sessionId: string, messages: ChatMessage[]) => {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? "..." : "")
        : "Neue Unterhaltung";
      const updatedAt = Date.now();

      setSessions((prev) => {
        const existing = prev.find((session) => session.id === sessionId);
        if (!existing) {
          return prev;
        }
        const updatedSession: ChatSession = {
          ...existing,
          title,
          messages,
          updatedAt,
        };
        return [updatedSession, ...prev.filter((session) => session.id !== sessionId)];
      });

      void fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }).catch((error) => {
        console.error("Failed to persist chat session update:", error);
      });
    },
    []
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);

      if (currentSessionId === sessionId) {
        setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
      }

      void fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      }).catch((error) => {
        console.error("Failed to delete chat session:", error);
      });
    },
    [currentSessionId, sessions]
  );

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  return {
    sessions,
    currentSession,
    currentSessionId,
    isLoaded,
    createSession,
    updateSession,
    deleteSession,
    selectSession,
  };
}

