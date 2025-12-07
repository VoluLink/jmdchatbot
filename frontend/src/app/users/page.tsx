"use client";

import { useState, useEffect } from "react";
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Mail, 
  Crown,
  Users,
  Search,
  MoreVertical,
  Check,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: number;
  lastActive?: number;
}

const STORAGE_KEY = "rag-users";

// Default admin user
const DEFAULT_ADMIN: User = {
  id: "1",
  name: "Administrator",
  email: "admin@amiko.local",
  role: "admin",
  createdAt: Date.now(),
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" as "admin" | "user" });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load users from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUsers(JSON.parse(stored));
      } catch (e) {
        setUsers([DEFAULT_ADMIN]);
      }
    } else {
      setUsers([DEFAULT_ADMIN]);
    }
    setIsLoaded(true);
  }, []);

  // Save users to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
  }, [users, isLoaded]);

  const addUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    
    const user: User = {
      id: Date.now().toString(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role,
      createdAt: Date.now(),
    };
    
    setUsers(prev => [...prev, user]);
    setNewUser({ name: "", email: "", role: "user" });
    setShowAddForm(false);
  };

  const deleteUser = (id: string) => {
    // Prevent deleting the last admin
    const user = users.find(u => u.id === id);
    if (user?.role === "admin") {
      const adminCount = users.filter(u => u.role === "admin").length;
      if (adminCount <= 1) {
        alert("Es muss mindestens ein Administrator vorhanden sein.");
        return;
      }
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const toggleRole = (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    // Prevent demoting the last admin
    if (user.role === "admin") {
      const adminCount = users.filter(u => u.role === "admin").length;
      if (adminCount <= 1) {
        alert("Es muss mindestens ein Administrator vorhanden sein.");
        return;
      }
    }
    
    setUsers(prev => prev.map(u => 
      u.id === id ? { ...u, role: u.role === "admin" ? "user" : "admin" } : u
    ));
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role === "user").length;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-[#212121]">
        <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full bg-[#212121] text-slate-100 overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Users className="h-7 w-7" />
              Benutzerverwaltung
            </h1>
            <p className="text-slate-400 mt-1">
              Verwalten Sie Benutzerkonten und Berechtigungen
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Benutzer hinzufügen
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Users className="h-5 w-5 text-indigo-400" />
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
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <UserIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{userCount}</p>
                <p className="text-xs text-slate-400">Benutzer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Benutzer suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          />
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Neuen Benutzer anlegen
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="Max Mustermann"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">E-Mail</label>
                <input
                  type="email"
                  placeholder="max@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Rolle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as "admin" | "user" }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="user" className="bg-[#212121]">Benutzer</option>
                  <option value="admin" className="bg-[#212121]">Administrator</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewUser({ name: "", email: "", role: "user" });
                }}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={addUser}
                disabled={!newUser.name.trim() || !newUser.email.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Erstellen
              </button>
            </div>
          </div>
        )}

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
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium",
                        user.role === "admin" 
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
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
                    <button
                      onClick={() => toggleRole(user.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        user.role === "admin"
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                          : "bg-slate-500/20 text-slate-300 hover:bg-slate-500/30"
                      )}
                    >
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
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-400">
                      {formatDate(user.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Benutzer löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
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
        <p className="text-xs text-slate-500 mt-4 text-center">
          Benutzerdaten werden lokal im Browser gespeichert.
        </p>
      </div>
    </div>
  );
}

