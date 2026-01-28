"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";

type UrlSource = {
  id: string;
  url: string;
  name: string;
  fetchIntervalDays: number;
  enabled: boolean;
  lastFetched?: string;
  lastError?: string;
  lastIndexed?: string;
  pendingUpdate?: boolean;
  createdAt: string;
  updatedAt: string;
};

type ModalType =
  | { type: "add" }
  | { type: "edit"; source: UrlSource }
  | { type: "delete"; source: UrlSource }
  | null;

export function UrlSourcesManager() {
  const [sources, setSources] = useState<UrlSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources/urls");
      const data = await res.json();
      setSources(data.sources || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load URL sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleAdd = async (url: string, name: string, fetchIntervalDays: number) => {
    try {
      const res = await fetch("/api/sources/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name, fetchIntervalDays, enabled: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add URL source");
      await fetchSources();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add URL source");
    }
  };

  const handleEdit = async (id: string, url: string, name: string, fetchIntervalDays: number) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/sources/urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, url, name, fetchIntervalDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update URL source");
      await fetchSources();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update URL source");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/sources/urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle URL source");
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle URL source");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/sources/urls?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete URL source");
      await fetchSources();
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete URL source");
    } finally {
      setBusyId(null);
    }
  };

  const handleApplyUpdate = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/sources/urls/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply update");
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply update");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Lade URL-Quellen…
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 overflow-hidden backdrop-blur-lg">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">URL-Quellen</h3>
            <p className="text-xs text-slate-400 mt-1">
              Werden täglich automatisch geprüft • Änderungen erfordern manuelle Bestätigung
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "add" })}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0077DD]/20 border border-[#0077DD]/30 text-xs font-semibold text-[#0077DD] hover:bg-[#0077DD]/30 hover:border-[#0077DD]/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            URL hinzufügen
          </button>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="divide-y divide-white/10">
          {sources.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Globe className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300 mb-2">Keine URL-Quellen konfiguriert</p>
              <p className="text-xs text-slate-400">
                Fügen Sie Web-Quellen hinzu, die automatisch aktualisiert werden
              </p>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className={`px-5 py-4 hover:bg-white/5 transition-colors ${
                  busyId === source.id ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center ${
                      source.enabled
                        ? "bg-[#0077DD]/20 text-[#0077DD] border border-[#0077DD]/30"
                        : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {source.name}
                      </h4>
                      {!source.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300">
                          Deaktiviert
                        </span>
                      )}
                      {source.pendingUpdate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#66B3FF]/20 text-[#66B3FF] border border-[#66B3FF]/30 animate-pulse">
                          ⚠️ Änderungen erkannt
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-2">{source.url}</p>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Alle {source.fetchIntervalDays} Tag{source.fetchIntervalDays !== 1 ? 'e' : ''}</span>
                      </div>
                      {source.lastFetched && (
                        <div className="flex items-center gap-1">
                          {source.lastError ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-300">Fehler</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-[#0077DD]" />
                              <span>
                                {new Date(source.lastFetched).toLocaleString("de-DE", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {source.lastError && (
                      <p className="text-xs text-slate-300 mt-2 line-clamp-1">
                        ⚠️ {source.lastError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {source.pendingUpdate && (
                      <button
                        onClick={() => handleApplyUpdate(source.id)}
                        disabled={busyId === source.id}
                        className="px-3 py-1.5 rounded-lg border border-[#66B3FF]/30 bg-[#66B3FF]/10 text-[#66B3FF] hover:bg-[#66B3FF]/20 disabled:opacity-50 transition-all text-xs font-semibold"
                        title="Index aktualisieren"
                      >
                        <RefreshCw className="w-3 h-3 inline mr-1" />
                        Update Index
                      </button>
                    )}

                    <button
                      onClick={() => handleToggle(source.id, !source.enabled)}
                      disabled={busyId === source.id}
                      className={`p-2 rounded-lg border transition-all ${
                        source.enabled
                          ? "border-[#0077DD]/30 bg-[#0077DD]/10 text-[#0077DD] hover:bg-[#0077DD]/20"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                      } disabled:opacity-50`}
                      title={source.enabled ? "Deaktivieren" : "Aktivieren"}
                    >
                      {source.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setModal({ type: "edit", source })}
                      disabled={busyId === source.id}
                      className="p-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50 transition-all"
                      title="Bearbeiten"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setModal({ type: "delete", source })}
                      disabled={busyId === source.id}
                      className="p-2 rounded-lg border border-red-300/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {sources.length} URL-Quelle(n) • Quellen mit ⚠️ Badge haben Änderungen
          </span>
          <CheckUrlsButton />
        </div>
      </div>

      {modal?.type === "add" && (
        <UrlSourceModal
          title="URL-Quelle hinzufügen"
          onConfirm={handleAdd}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "edit" && (
        <UrlSourceModal
          title="URL-Quelle bearbeiten"
          initialUrl={modal.source.url}
          initialName={modal.source.name}
          initialIntervalDays={modal.source.fetchIntervalDays}
          onConfirm={(url, name, days) => handleEdit(modal.source.id, url, name, days)}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteUrlModal
          source={modal.source}
          onConfirm={() => handleDelete(modal.source.id)}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

function UrlSourceModal({
  title,
  initialUrl = "",
  initialName = "",
  initialIntervalDays = 1, // Default: daily
  onConfirm,
  onCancel,
}: {
  title: string;
  initialUrl?: string;
  initialName?: string;
  initialIntervalDays?: number;
  onConfirm: (url: string, name: string, fetchIntervalDays: number) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [name, setName] = useState(initialName);
  const [fetchIntervalDays, setFetchIntervalDays] = useState(initialIntervalDays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && name.trim()) {
      onConfirm(url.trim(), name.trim(), fetchIntervalDays);
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
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Gesetze Portal"
              autoFocus
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/dokumente"
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Aktualisierungsintervall (Tage)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={fetchIntervalDays}
              onChange={(e) => setFetchIntervalDays(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">
              Minimum: 1 Tag • Standard: 1 Tag (täglich)
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!url.trim() || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0077DD] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {initialUrl ? "Speichern" : "Hinzufügen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteUrlModal({
  source,
  onConfirm,
  onCancel,
}: {
  source: UrlSource;
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
        <h3 className="text-lg font-semibold text-white mb-4">URL-Quelle löschen?</h3>
        <p className="text-sm text-slate-300 mb-6">
          Möchten Sie <span className="font-semibold text-white">{source.name}</span> wirklich
          löschen?
          <span className="block mt-2 text-slate-400">
            Die indexierten Inhalte bleiben erhalten, werden aber nicht mehr aktualisiert.
          </span>
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

function CheckUrlsButton() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);

    try {
      const res = await fetch("/api/jobs/check-urls", {
        method: "POST",
      });
      const data = await res.json();

      setResult({
        success: data.success,
        message: data.success
          ? "✅ Prüfung abgeschlossen!"
          : `❌ ${data.error || "Fehlgeschlagen"}`,
      });

      // Reload page after successful check to show updated sources
      if (data.success) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setResult({
        success: false,
        message: "❌ Fehler",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCheck}
        disabled={checking}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-xs text-slate-400 hover:bg-slate-500/20 hover:text-slate-300 disabled:opacity-50 transition-all"
        title="Manuell auf Änderungen prüfen (normalerweise automatisch täglich)"
      >
        {checking ? (
          <div className="w-3 h-3 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
      </button>

      {result && (
        <div
          className={`absolute bottom-full right-0 mb-2 px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-xl z-10 ${
            result.success
              ? "bg-[#0077DD]/90 text-white"
              : "bg-slate-500/90 text-white"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

