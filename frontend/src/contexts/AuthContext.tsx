"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

type User = {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
  "/login/backup-code",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        // Redirect to login if not on public path
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.push("/login");
        }
      }
    } catch (err) {
      setUser(null);
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const refresh = async () => {
    await fetchUser();
  };

  // Show loading on protected routes
  if (loading && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="h-screen w-screen bg-[#212121] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

