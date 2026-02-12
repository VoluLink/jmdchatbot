"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  History,
  MessageCircle,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/lib/useChatHistory";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const navigation = [
  { name: "Chat", href: "/", icon: MessageSquare },
  { name: "Dokumente", href: "/documents", icon: FileText },
  { name: "Benutzer", href: "/users", icon: Users },
  { name: "Einstellungen", href: "/settings", icon: Settings },
];

interface SidebarProps {
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void | Promise<unknown>;
  onDeleteSession?: (id: string) => void;
}

export function Sidebar({
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  };

  const handleSessionClick = (sessionId: string) => {
    // Select the session first
    onSelectSession?.(sessionId);
    // Navigate to home page if not already there
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleNewSession = () => {
    // Create new session
    void onNewSession?.();
    // Navigate to home page if not already there
    if (pathname !== "/") {
      router.push("/");
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-[#181818] text-slate-100 border-r border-black/30 transition-all duration-300 ease-in-out z-20">
      {/* Header - clickable to start a new chat */}
      <Link
        href="/"
        onClick={() => {
          void onNewSession?.();
        }}
        className="flex h-16 items-center px-5 border-b border-white/10 hover:bg-white/5 transition-colors"
      >
        <span className="text-[13px] font-semibold text-slate-100 tracking-wide uppercase">
          JMDChatbot
        </span>
      </Link>
      
      <div className="flex-1 overflow-y-auto py-6 px-3 dark-scrollbar">
        <div className="mb-2 px-3">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Navigation</span>
        </div>
        
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center">
                  <item.icon
                    className={cn(
                      "mr-3 h-4 w-4 flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </Link>
            );
          })}
        </nav>

        {/* Chat History Section - Always visible */}
        <div className="mt-6">
          <button
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-full flex items-center justify-between px-3 mb-2 group"
          >
            <div className="flex items-center gap-2">
              <History className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                Verlauf
              </span>
            </div>
            <ChevronDown 
              className={cn(
                "h-3 w-3 text-slate-400 transition-transform duration-200",
                !isHistoryExpanded && "-rotate-90"
              )} 
            />
          </button>

          {isHistoryExpanded && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
              {/* New Chat Button */}
              <button
                onClick={handleNewSession}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Neue Unterhaltung</span>
              </button>

              {/* Session List */}
              <div className="max-h-[300px] overflow-y-auto space-y-0.5 pr-1 dark-scrollbar">
                {sessions.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500">
                    Noch keine Unterhaltungen.
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-150",
                        session.id === currentSessionId
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      )}
                      onClick={() => handleSessionClick(session.id)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {session.title}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDate(session.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession?.(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                        title="Löschen"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-md border border-white/10 bg-white/5">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold",
            user?.role === "admin"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
          )}>
            {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-300 transition-colors"
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
