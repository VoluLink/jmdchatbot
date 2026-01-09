"use client";

import { Sidebar } from "@/components/Sidebar";
import { useChatHistory, ChatMessage } from "@/lib/useChatHistory";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
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
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPath = pathname === "/login" || pathname === "/register";

  // Show loading spinner while checking auth
  if (loading && !isPublicPath) {
    return (
      <div className="h-screen w-screen bg-[#212121] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user && !isPublicPath && !loading) {
    return (
      <div className="h-screen w-screen bg-[#212121] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Public routes (login/register) - no sidebar
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Authenticated routes - with sidebar
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

