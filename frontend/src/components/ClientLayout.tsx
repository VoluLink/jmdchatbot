"use client";

import { Sidebar } from "@/components/Sidebar";
import { useChatHistory, ChatMessage } from "@/lib/useChatHistory";
import { createContext, useContext } from "react";

interface ChatHistoryContextType {
  sessions: ReturnType<typeof useChatHistory>["sessions"];
  currentSession: ReturnType<typeof useChatHistory>["currentSession"];
  currentSessionId: string | null;
  isLoaded: boolean;
  createSession: () => ReturnType<typeof useChatHistory>["currentSession"];
  updateSession: (sessionId: string, messages: ChatMessage[]) => void;
  deleteSession: (sessionId: string) => void;
  selectSession: (sessionId: string) => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | null>(null);

export function useChatHistoryContext() {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error("useChatHistoryContext must be used within ClientLayout");
  }
  return context;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const chatHistory = useChatHistory();

  return (
    <ChatHistoryContext.Provider value={chatHistory}>
      <Sidebar
        sessions={chatHistory.sessions}
        currentSessionId={chatHistory.currentSessionId}
        onSelectSession={chatHistory.selectSession}
        onNewSession={chatHistory.createSession}
        onDeleteSession={chatHistory.deleteSession}
      />
      <main className="flex-1 h-full overflow-hidden relative flex flex-col z-10">
        {children}
      </main>
    </ChatHistoryContext.Provider>
  );
}

