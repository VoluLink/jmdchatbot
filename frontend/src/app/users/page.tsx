"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Trash2,
  User as UserIcon,
  Mail,
  Crown,
  Users,
  Search,
  RefreshCw,
  Shield,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  lastLogin?: string;
}

type ModalType = 
  | { type: "add" }
  | { type: "delete"; user: User }
  | null;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<ModalType>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (name: string, email: string, password: string, role: "admin" | "user") => {
    setBusyId("new");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      await fetchUsers();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/auth/users?id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      await fetchUsers();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  };

  const handleSendPasswordReset = async (userId: string, userEmail: string) => {
    setResetPasswordStatus((prev) => ({ ...prev, [userId]: "sending" }));

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Senden der E-Mail");
      }

      setResetPasswordStatus((prev) => ({ ...prev, [userId]: "sent" }));
      setTimeout(() => {
        setResetPasswordStatus((prev) => ({ ...prev, [userId]: "idle" }));
      }, 3000);
    } catch (err) {
      console.error("Failed to send password reset:", err);
      setResetPasswordStatus((prev) => ({ ...prev, [userId]: "error" }));
      setTimeout(() => {
        setResetPasswordStatus((prev) => ({ ...prev, [userId]: "idle" }));
      }, 3000);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role === "user").length;

  const formatDate = (isoString?: string) => {
    if (!isoString) return "–";
    return new Date(isoString).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#212121]">
        <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full w-full overflow-y-auto bg-[#212121] text-slate-100 grey-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
                Benutzer
              </p>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-semibold text-white leading-tight">
                  Benutzerverwaltung
                </h1>
              </div>
              <p className="text-sm text-slate-300">
                Verwalte Benutzerkonten und Berechtigungen
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setModal({ type: "add" })}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#00529E] hover:bg-[#0066C0] text-white rounded-lg transition-colors font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Benutzer hinzufügen
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
              <p className="text-sm text-red-200">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded">
                <X className="w-4 h-4 text-red-200" />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0066C0]/20 rounded-lg">
                  <Users className="h-5 w-5 text-[#0077DD]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">{users.length}</p>
                  <p className="text-xs text-slate-400">Gesamt</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Crown className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">{adminCount}</p>
                  <p className="text-xs text-slate-400">Administratoren</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00529E]/20 rounded-lg">
                  <UserIcon className="h-5 w-5 text-[#0077DD]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">{userCount}</p>
                  <p className="text-xs text-slate-400">Benutzer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Benutzer suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0066C0]/50 focus:border-[#0066C0]/50"
            />
          </div>

          {/* Users Table */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                    Benutzer
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                    Rolle
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                    Erstellt am
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                    Letzter Login
                  </th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={cn(
                    "hover:bg-white/5 transition-colors",
                    busyId === user.id && "opacity-50"
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium",
                          user.role === "admin"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-[#00529E]/20 text-[#66B3FF] border border-[#00529E]/30"
                        )}>
                          {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                        user.role === "admin"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-[#00529E]/20 text-[#66B3FF]"
                      )}>
                        {user.role === "admin" ? (
                          <>
                            <Crown className="h-3 w-3" />
                            Administrator
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-3 w-3" />
                            Benutzer
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-400">
                        {formatDate(user.lastLogin)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const status = resetPasswordStatus[user.id] || "idle";
                            return (
                              <button
                                onClick={() => handleSendPasswordReset(user.id, user.email)}
                                disabled={status === "sending" || status === "sent"}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  status === "sent"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : status === "error"
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                                    : status === "sending"
                                    ? "bg-[#0066C0]/20 text-[#66B3FF] border border-[#0066C0]/30 cursor-wait"
                                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20",
                                  "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                                title="Passwort-Zurücksetzen-Link per E-Mail senden"
                              >
                                {status === "sending" ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Senden...</span>
                                  </>
                                ) : status === "sent" ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Gesendet</span>
                                  </>
                                ) : status === "error" ? (
                                  <>
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Fehler</span>
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-3 h-3" />
                                    <span>Reset</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => setModal({ type: "delete", user })}
                            disabled={busyId === user.id || user.id === currentUser?.id}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={user.id === currentUser?.id ? "Kann dich selbst nicht löschen" : "Benutzer löschen"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-slate-500">–</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <UserIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">
                        {searchQuery ? "Keine Benutzer gefunden" : "Keine Benutzer vorhanden"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-500 text-center">
            Benutzerdaten werden in SQLite gespeichert (data/auth.db)
          </p>
        </div>
      </div>

      {/* Add User Modal */}
      {modal?.type === "add" && (
        <AddUserModal
          onConfirm={handleAddUser}
          onCancel={() => setModal(null)}
          busy={busyId === "new"}
        />
      )}

      {/* Delete User Modal */}
      {modal?.type === "delete" && (
        <DeleteUserModal
          user={modal.user}
          onConfirm={() => handleDelete(modal.user.id)}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

function AddUserModal({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: (name: string, email: string, password: string, role: "admin" | "user") => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim() && password.trim()) {
      onConfirm(name.trim(), email.trim(), password.trim(), role);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-[#2a2a2a] border border-white/15 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Neuen Benutzer erstellen</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              autoFocus
              required
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@example.com"
              required
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">Mindestens 6 Zeichen</p>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20 transition-all"
            >
              <option value="user">Benutzer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !email.trim() || !password.trim() || busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#00529E] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Erstelle…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Erstellen</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteUserModal({
  user,
  onConfirm,
  onCancel,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-[#2a2a2a] border border-white/15 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Benutzer löschen?</h3>
        <p className="text-sm text-slate-300 mb-6">
          Möchten Sie <span className="font-semibold text-white">{user.name}</span> ({user.email}) wirklich löschen?
          {user.role === "admin" && (
            <span className="block mt-2 text-amber-300">
              ⚠️ Dies ist ein Administrator-Account
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-all"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
