"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Download,
  Trash2,
  AlertCircle,
} from "lucide-react";

type DocumentRequest = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: "text" | "file";
  description: string;
  fileName?: string;
  filePath?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export function DocumentRequestsManager() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/document-requests");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch requests");
      }

      setRequests(data.requests || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (requestId: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch("/api/document-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/document-requests?id=${requestId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete request");
      }

      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-[#0077DD]" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-[#66B3FF]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-[#0077DD]/20 text-[#0077DD] border-[#0077DD]/30";
      case "rejected":
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
      default:
        return "bg-[#66B3FF]/20 text-[#66B3FF] border-[#66B3FF]/30";
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-6 backdrop-blur-lg">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Lade Dokumentanfragen...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-6 backdrop-blur-lg space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-slate-50">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Dokumentanfragen</h3>
            <p className="text-sm text-slate-200">
              Verwalten Sie Anfragen von Benutzern für neue Dokumente
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#66B3FF]/20 text-[#66B3FF] border border-[#66B3FF]/30">
            <Clock className="w-3 h-3" />
            {pendingCount} Ausstehend
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0077DD]/20 text-[#0077DD] border border-[#0077DD]/30">
            <CheckCircle2 className="w-3 h-3" />
            {approvedCount} Genehmigt
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <XCircle className="w-3 h-3" />
            {rejectedCount} Abgelehnt
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Keine Dokumentanfragen vorhanden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      {request.status === "pending"
                        ? "Ausstehend"
                        : request.status === "approved"
                        ? "Genehmigt"
                        : "Abgelehnt"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-xs text-slate-300">
                      {request.type === "file" ? <FileText className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      {request.type === "file" ? "Datei" : "Text"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3 h-3" />
                      <span>{request.userName}</span>
                      <span>({request.userEmail})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  {request.fileName && (
                    <div className="flex items-center gap-2 text-sm text-slate-200">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{request.fileName}</span>
                    </div>
                  )}

                  {request.description && (
                    <p className="text-sm text-slate-300 bg-black/20 px-3 py-2 rounded-lg">
                      {request.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {request.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(request.id, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors"
                        title="Genehmigen"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Genehmigen
                      </button>
                      <button
                        onClick={() => updateStatus(request.id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
                        title="Ablehnen"
                      >
                        <XCircle className="w-3 h-3" />
                        Ablehnen
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteRequest(request.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
