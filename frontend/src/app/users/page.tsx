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
  Shield,
  X,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  Copy,
  ChevronDown,
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
  invitePending?: boolean;
  twoFaEnabled?: boolean;
  twoFaRequired?: boolean;
}

type ModalType =
  | { type: "add" }
  | { type: "delete"; user: User }
  | { type: "edit-role"; user: User }
  | { type: "reset-password"; user: User }
  | null;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    link: string;
    expiresAt: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<ModalType>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const handleAddUser = async (name: string, email: string, role: "admin" | "user") => {
    setBusyId("new");
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite user");
      if (!data.inviteLink || !data.expiresAt) {
        throw new Error("Invite link was not generated");
      }
      setInviteInfo({
        email: data.user?.email || email,
        link: data.inviteLink,
        expiresAt: data.expiresAt,
      });
      await fetchUsers();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
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

  const handleResetPassword = async (userId: string, newPassword: string) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/auth/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateRole = async (userId: string, role: "admin" | "user") => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      await fetchUsers();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleTwoFaRequired = async (userId: string, required: boolean) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, twoFaRequired: required }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update 2FA requirement");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update 2FA requirement");
    } finally {
      setBusyId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role === "user").length;

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAdmin = currentUser?.role === "admin";

  const copyWithFallback = (text: string): boolean => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let success = false;
    try {
      success = document.execCommand("copy");
    } catch {
      success = false;
    } finally {
      document.body.removeChild(textarea);
    }

    return success;
  };

  const copyInviteLink = async () => {
    if (!inviteInfo?.link) return;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText &&
        typeof window !== "undefined" &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(inviteInfo.link);
      } else {
        const ok = copyWithFallback(inviteInfo.link);
        if (!ok) throw new Error("copy_failed");
      }

      setError(null);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setError(
        "Einladungslink konnte nicht automatisch kopiert werden. Bitte Link manuell markieren und kopieren."
      );
    }
  };

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
                Benutzer einladen
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

          {inviteInfo && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
              <p className="text-sm text-emerald-200">
                Einladung erstellt fuer <span className="font-medium">{inviteInfo.email}</span>.
              </p>
              <p className="text-xs text-emerald-300/80 break-all">{inviteInfo.link}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyInviteLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 transition-colors"
                >
                  {copyStatus === "success" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Link kopieren
                    </>
                  )}
                </button>
                <span className="text-xs text-emerald-300/70">
                  Gueltig bis {formatDate(inviteInfo.expiresAt)}
                </span>
              </div>
              {copyStatus === "error" && (
                <p className="text-xs text-amber-200/90">
                  Falls Kopieren blockiert ist: Link markieren und mit Strg+C kopieren.
                </p>
              )}
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
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Crown className="h-5 w-5 text-purple-400" />
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
                  {isAdmin && (
                    <>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                        Erstellt am
                      </th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                        Letzter Login
                      </th>
                      <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                        Aktionen
                      </th>
                    </>
                  )}
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
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-400"
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
                        {isAdmin && user.invitePending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">
                            Einladung offen
                          </span>
                        )}
                        {isAdmin && user.twoFaEnabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Shield className="h-3 w-3" />
                            2FA aktiv
                          </span>
                        )}
                        {isAdmin && user.twoFaRequired && !user.twoFaEnabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Shield className="h-3 w-3" />
                            2FA erforderlich
                          </span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setModal({ type: "edit-role", user })}
                              disabled={busyId === user.id || user.id === currentUser?.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={user.id === currentUser?.id ? "Eigene Rolle kann nicht geaendert werden" : "Rolle aendern"}
                            >
                              <Shield className="w-3 h-3" />
                              <span>Rolle</span>
                            </button>
                            <button
                              onClick={() => handleToggleTwoFaRequired(user.id, !user.twoFaRequired)}
                              disabled={busyId === user.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                user.twoFaRequired
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
                              )}
                              title={user.twoFaRequired ? "2FA nicht mehr erforderlich" : "2FA erforderlich machen"}
                            >
                              <Shield className="w-3 h-3" />
                              <span>2FA</span>
                            </button>
                            <button
                              onClick={() => setModal({ type: "reset-password", user })}
                              disabled={busyId === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Passwort zuruecksetzen"
                            >
                              <Key className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                            <button
                              onClick={() => setModal({ type: "delete", user })}
                              disabled={busyId === user.id || user.id === currentUser?.id}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={user.id === currentUser?.id ? "Kann dich selbst nicht loeschen" : "Benutzer loeschen"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 2} className="px-6 py-12 text-center">
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
            Konten werden per Einladung freigeschaltet.
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

      {/* Edit Role Modal */}
      {modal?.type === "edit-role" && (
        <EditRoleModal
          user={modal.user}
          onConfirm={(role) => handleUpdateRole(modal.user.id, role)}
          onCancel={() => setModal(null)}
          busy={busyId === modal.user.id}
        />
      )}

      {/* Reset Password Modal */}
      {modal?.type === "reset-password" && (
        <ResetPasswordModal
          user={modal.user}
          onConfirm={(newPassword) => handleResetPassword(modal.user.id, newPassword)}
          onCancel={() => setModal(null)}
          busy={busyId === modal.user.id}
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
  onConfirm: (name: string, email: string, role: "admin" | "user") => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onConfirm(name.trim(), email.trim(), role);
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
        <h3 className="text-lg font-semibold text-white mb-4">Benutzer einladen</h3>
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
          </div>          <p className="text-xs text-slate-500">
            Der Benutzer erhaelt einen Einladungslink und setzt sein Passwort selbst.
          </p>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Rolle</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-[#1f1f1f]/95 border border-white/15 rounded-lg text-white shadow-inner shadow-black/20 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
              >
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
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
              disabled={!name.trim() || !email.trim() || busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#00529E] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Erstelle...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Einladungslink erstellen</span>
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
        <h3 className="text-lg font-semibold text-white mb-4">Benutzer loeschen?</h3>
        <p className="text-sm text-slate-300 mb-6">
          Moechten Sie <span className="font-semibold text-white">{user.name}</span> ({user.email}) wirklich loeschen?
          {user.role === "admin" && (
            <span className="block mt-2 text-purple-300">
              Hinweis: Dies ist ein Administrator-Account
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
            Loeschen
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  user,
  onConfirm,
  onCancel,
  busy,
}: {
  user: User;
  onConfirm: (newPassword: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwoerter stimmen nicht ueberein");
      return;
    }

    onConfirm(newPassword);
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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0066C0]/20 rounded-lg">
            <Key className="h-5 w-5 text-[#0077DD]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Passwort zuruecksetzen</h3>
            <p className="text-sm text-slate-400">{user.name} ({user.email})</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Neues Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="********"
                autoFocus
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Mindestens 6 Zeichen</p>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Passwort bestaetigen</label>
            <div className="relative">
              <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20 transition-all"
              />
            </div>
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
              disabled={!newPassword || !confirmPassword || busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#00529E] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Passwort setzen</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({
  user,
  onConfirm,
  onCancel,
  busy,
}: {
  user: User;
  onConfirm: (role: "admin" | "user") => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [role, setRole] = useState<"admin" | "user">(user.role);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === user.role) {
      setError("Bitte eine andere Rolle auswaehlen");
      return;
    }

    onConfirm(role);
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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0066C0]/20 rounded-lg">
            <Shield className="h-5 w-5 text-[#0077DD]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Rolle aendern</h3>
            <p className="text-sm text-slate-400">{user.name} ({user.email})</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Neue Rolle</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-[#1f1f1f]/95 border border-white/15 rounded-lg text-white shadow-inner shadow-black/20 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
              >
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
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
              disabled={busy || role === user.role}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#00529E] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Rolle speichern</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

