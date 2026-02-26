"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, MessageSquare, Trash2, User, ExternalLink } from "lucide-react";
import { cn, encodePathSegments } from "@/lib/utils";
import { useChatHistoryContext } from "./ClientLayout";
import Link from "next/link";

interface Source {
  id?: number;
  score: number | null;
  source: string | null;
  path: string | null;
  filename?: string;
  url: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  id?: string;
}

// Allow overriding the backend URL (useful for deployments that can't reach localhost).
// If not set, fall back to a relative path so a reverse proxy can route /query.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

export function ChatInterface() {
  const { currentSession, currentSessionId, updateSession, createSession } = useChatHistoryContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({ topK: 5, showSources: true, temperature: 0.7, chunkSize: 512 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load settings from localStorage and listen for changes
  useEffect(() => {
    const loadSettings = () => {
      const stored = localStorage.getItem("rag-assistant-settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSettings(parsed);
        } catch {}
      }
    };

    loadSettings();

    // Listen for settings changes
    const handleSettingsChange = (e: CustomEvent) => {
      setSettings(e.detail);
    };

    window.addEventListener("rag-settings-changed" as any, handleSettingsChange);
    return () => window.removeEventListener("rag-settings-changed" as any, handleSettingsChange);
  }, []);

  // Load messages from current session
  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages as Message[]);
    } else {
      setMessages([]);
    }
  }, [currentSession, currentSessionId]);

  // Save messages to session whenever they change
  const saveMessages = useCallback((sessionId: string, newMessages: Message[]) => {
    if (newMessages.length > 0) {
      updateSession(sessionId, newMessages);
    }
  }, [updateSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    // Create a new session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createSession();
      sessionId = newSession?.id || null;
      if (!sessionId) {
        return;
      }
    }

    const userMessage = input.trim();
    setInput("");
    if (inputRef.current) {
        inputRef.current.style.height = '40px'; // Reset height
    }
    
    const userMsg: Message = { role: "user", content: userMessage, id: Date.now().toString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (sessionId) saveMessages(sessionId, newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage,
          top_k: settings.topK,
          temperature: settings.temperature,
          chunk_size: settings.chunkSize,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      
      const assistantMsg: Message = { 
        role: "assistant", 
        content: data.answer,
        sources: data.sources,
        id: (Date.now() + 1).toString()
      };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      if (sessionId) saveMessages(sessionId, updatedMessages);
    } catch (error) {
      console.error("Chat request failed", error);
      const errorMsg: Message = { 
        role: "assistant",
        content: `Entschuldigung, ich konnte das Backend nicht erreichen (${API_BASE_URL}/query). Bitte prüfen Sie, ob der Server läuft und ob die Umgebungskonfiguration stimmt.`,
        id: (Date.now() + 1).toString()
      };
      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);
      if (sessionId) saveMessages(sessionId, updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setMessages([]);
    void createSession(); // Start a new session
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-[#212121] text-slate-100">
        {/* Header for context and actions */}
        {messages.length > 0 && (
            <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex justify-between items-center bg-white/10 backdrop-blur-md border-b border-white/10 transition-all animate-fade-in">
                <div>
                    <h2 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">Chat Session</h2>
                </div>
                <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                </button>
            </div>
        )}

      <div className={cn(
          "flex-1 overflow-y-auto px-4 py-6 space-y-8 scroll-smooth dark-scrollbar flex flex-col",
          messages.length === 0 ? "justify-center" : "pt-20"
      )}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in">
            <div className="relative">
              <div className="h-20 w-20 bg-gradient-to-tr from-slate-500 to-gray-700 rounded-2xl blur-2xl opacity-20 absolute inset-0"></div>
              <div className="h-20 w-20 bg-white rounded-2xl shadow-xl flex items-center justify-center relative border border-gray-100">
                <MessageSquare className="h-10 w-10 text-gray-700" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-semibold text-gray-200 tracking-tight">Wie kann ich dir helfen?</h2>
              <p className="text-gray-400">Stell mir Fragen zu deinen Dokumenten und ich finde die Antworten für dich.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full mt-8">
              {["Was ist das Chancenaufenthaltsrecht?", "Welche Voraussetzungen gelten für § 25b AufenthG?", "Wie funktioniert die Ausbildungsduldung?", "Was sind die Anforderungen für die Einbürgerung?"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                      setInput(suggestion);
                      // Focus textarea after React re-renders with the new input value
                      setTimeout(() => document.querySelector('textarea')?.focus(), 0);
                  }}
                  className="px-4 py-3 text-sm text-left text-gray-200 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl transition-all hover:text-white hover:border-white/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((message: Message, index: number) => (
          <div
            key={message.id || index}
            className={cn(
              "flex w-full animate-slide-up gap-4",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/40 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm mt-1">
                    <Bot className="w-4 h-4 text-gray-600" />
                </div>
            )}

            <div
              className={cn(
                "flex max-w-[80%] md:max-w-[70%] flex-col gap-2",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "px-5 py-3 text-[15px] leading-relaxed backdrop-blur-md shadow-sm",
                  message.role === "user"
                    ? "bg-black/80 text-white rounded-2xl rounded-tr-sm"
                    : "bg-white/40 text-gray-800 rounded-2xl rounded-tl-sm border border-white/20"
                )}
              >
                {message.role === "assistant" ? (
                  <p 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: message.content.replace(
                        /\[(\d+)\]/g,
                        '<span class="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[#0077DD] text-white rounded-full mx-0.5 align-middle cursor-default" title="Quelle $1">$1</span>'
                      )
                    }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              
              {settings.showSources && message.sources && message.sources.length > 0 && (() => {
                // Deduplicate sources by filename, keeping highest score and collecting all citation IDs
                const uniqueSources = message.sources.reduce((acc: Map<string, {source: Source, ids: number[]}>, source: Source, idx: number) => {
                  const filename = source.filename || source.path?.split(/[\\/]/).pop() || `Quelle ${idx + 1}`;
                  const existing = acc.get(filename);
                  const currentId = source.id || idx + 1;
                  
                  if (existing) {
                    existing.ids.push(currentId);
                    if ((source.score || 0) > (existing.source.score || 0)) {
                      existing.source = source;
                    }
                  } else {
                    acc.set(filename, { source, ids: [currentId] });
                  }
                  return acc;
                }, new Map());

                return (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
                    {Array.from(uniqueSources.entries()).map(([filename, { source, ids }]) => (
                      <Link
                        key={filename}
                        href={`/documents/${encodePathSegments(filename)}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/40 border border-white/20 rounded-full shadow-sm text-[11px] text-gray-600 hover:bg-[#0077DD]/20 hover:border-[#0077DD]/50 hover:text-[#0077DD] transition-colors cursor-pointer backdrop-blur-sm group"
                        title={`${filename} - Klicken zum Öffnen`}
                      >
                        <span className="flex-shrink-0 flex items-center gap-0.5">
                          {ids.map((id: number) => (
                            <span key={id} className="w-4 h-4 flex items-center justify-center bg-[#0077DD] text-white text-[9px] font-bold rounded-full group-hover:bg-[#0066C0]">
                              {id}
                            </span>
                          ))}
                        </span>
                        <span className="font-medium truncate max-w-[120px]">
                          {filename.replace('.pdf', '')}
                        </span>
                        {source.score && (
                          <span className="text-gray-400 text-[10px] group-hover:text-[#0077DD]">
                            {Math.round(source.score * 100)}%
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>

            {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-sm mt-1">
                    <User className="w-4 h-4 text-white" />
                </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/40 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm mt-1">
                <Bot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="bg-white/40 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 border border-white/20 flex items-center gap-2 shadow-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="pb-6 pt-2 px-4 z-10 w-full max-w-4xl mx-auto">
        <div className="relative">
          <div
            className="relative flex items-end gap-2 bg-transparent border border-white/15 rounded-[26px] p-2 transition-colors focus-within:border-white/25 bg-white/5 backdrop-blur-sm"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'inherit';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Frag mich etwas..."
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 placeholder:text-slate-400 py-3.5 px-4 text-[15px] resize-none max-h-[120px] overflow-y-auto dark-scrollbar"
              disabled={isLoading}
              rows={1}
              style={{ minHeight: '48px' }}
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-gray-900 text-white rounded-full hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed m-0.5 mb-1"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
            <div className="text-center mt-3">
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                RAG ASSISTENT
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
