"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  MoreVertical,
  FolderPlus,
  Edit2,
  Trash2,
  Move,
  X,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { encodePathSegments } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  indexed?: boolean;
  children?: TreeNode[];
};

type ContextMenuType = {
  x: number;
  y: number;
  node: TreeNode;
  type: "folder" | "file";
  unindexedPaths: string[];
};

type ModalType =
  | { type: "create"; parentPath: string }
  | { type: "rename"; node: TreeNode }
  | { type: "delete"; node: TreeNode }
  | { type: "move"; node: TreeNode; folders: string[] }
  | null;

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: init?.cache ?? "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

function flattenFolders(node: TreeNode): string[] {
  const out: string[] = [];
  if (node.type === "folder") {
    out.push(node.path);
    for (const child of node.children ?? []) {
      out.push(...flattenFolders(child));
    }
  }
  return out;
}

function collectUnindexedPaths(node: TreeNode): string[] {
  if (node.type === "file") {
    return node.indexed ? [] : [node.path];
  }

  const out: string[] = [];
  for (const child of node.children ?? []) {
    out.push(...collectUnindexedPaths(child));
  }
  return out;
}

function collectIndexedPathSet(node: TreeNode): Set<string> {
  const indexed = new Set<string>();

  const walk = (n: TreeNode) => {
    if (n.type === "file") {
      if (n.indexed) indexed.add(n.path);
      return;
    }
    for (const child of n.children ?? []) {
      walk(child);
    }
  };

  walk(node);
  return indexed;
}

export function DocumentManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set([""]));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuType | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [indexingTargets, setIndexingTargets] = useState<Set<string>>(new Set());
  const [indexingActivePath, setIndexingActivePath] = useState<string | null>(null);
  const [globalIndexing, setGlobalIndexing] = useState(false);
  const [globalIndexResult, setGlobalIndexResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const refresh = useCallback(async (): Promise<TreeNode | null> => {
    setError(null);
    try {
      const data = await apiJson<{ tree: TreeNode }>("/api/document-management/tree");
      setTree(data.tree);
      return data.tree;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSourcesUpdated = () => {
      void refresh();
    };

    window.addEventListener("sources-updated", onSourcesUpdated);
    return () => {
      window.removeEventListener("sources-updated", onSourcesUpdated);
    };
  }, [refresh]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setModal(null);
      }
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const folders = useMemo(() => (tree ? flattenFolders(tree).sort() : []), [tree]);

  const toggleFolder = (p: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    const unindexedPaths = collectUnindexedPaths(node);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
      type: node.type,
      unindexedPaths,
    });
  };

  const handleCreateFolder = async (parentPath: string, name: string) => {
    if (!name.trim()) return;
    setBusyPath(parentPath);
    try {
      await apiJson("/api/document-management/folders", {
        method: "POST",
        body: JSON.stringify({ parentPath, name: name.trim() }),
      });
      setOpen((prev) => new Set(prev).add(parentPath));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const handleRenameFolder = async (folderPath: string, newName: string) => {
    if (!newName.trim()) return;
    setBusyPath(folderPath);
    try {
      await apiJson("/api/document-management/folders", {
        method: "PATCH",
        body: JSON.stringify({ path: folderPath, newName: newName.trim() }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    setBusyPath(folderPath);
    try {
      await apiJson("/api/document-management/folders", {
        method: "DELETE",
        body: JSON.stringify({ path: folderPath }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    setBusyPath(filePath);
    try {
      // Call backend to delete file
      const sourcesDir = filePath;
      const res = await fetch(`/api/documents/${encodePathSegments(sourcesDir)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete file");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const handleMoveItem = async (sourcePath: string, targetDir: string) => {
    setBusyPath(sourcePath);
    try {
      await apiJson("/api/document-management/move", {
        method: "POST",
        body: JSON.stringify({ sourcePath, targetDir }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyPath(null);
    }
  };

  const waitForIndexJob = async (
    onTick?: (status: { running: boolean }, latestTree: TreeNode | null) => void,
    timeoutMs = 30 * 60 * 1000
  ) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const statusRes = await fetch("/api/jobs/index-files", {
        method: "GET",
        cache: "no-store",
      });
      const status = (await statusRes.json().catch(() => ({}))) as {
        running?: boolean;
        success?: boolean;
        message?: string;
        errorTail?: string;
        outputTail?: string;
      };
      if (!status.running) {
        // Include error details in the message if indexing failed
        if (status.success === false && status.errorTail) {
          const errorMessage = status.errorTail.trim().split('\n').slice(-5).join('\n');
          status.message = `${status.message}\n\nFehlerdetails:\n${errorMessage}`;
        }
        return status as { success?: boolean; message?: string };
      }

      const latestTree = await refresh();
      onTick?.({ running: true }, latestTree);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    return null;
  };

  const handleIndexUnindexed = async (sourcePath: string, targetPaths: string[]) => {
    if (!targetPaths.length) {
      setInfo("Keine nicht indexierten Dateien in dieser Auswahl.");
      setTimeout(() => setInfo(null), 3000);
      return;
    }

    setBusyPath(sourcePath);
    setError(null);
    const totalTargets = targetPaths.length;
    setIndexingTargets(new Set(targetPaths));
    setIndexingActivePath(targetPaths[0] ?? null);
    setInfo(`Indexierung gestartet... (0/${totalTargets})`);

    try {
      const res = await fetch("/api/jobs/index-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false, targetPaths }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || data.message || "Indexierung konnte nicht gestartet werden");
      }

      const finalStatus = await waitForIndexJob((_status, latestTree) => {
        if (!latestTree) return;
        const indexedPaths = collectIndexedPathSet(latestTree);
        const pending = targetPaths.filter((relPath) => !indexedPaths.has(relPath));
        const done = totalTargets - pending.length;
        setIndexingActivePath(pending[0] ?? null);
        setInfo(`Indexierung laeuft... (${done}/${totalTargets})`);
      });
      if (!finalStatus) {
        setInfo("Indexierung laeuft weiterhin im Hintergrund.");
        return;
      }

      if (finalStatus.success) {
        const latestTree = await refresh();
        const indexedPaths = latestTree ? collectIndexedPathSet(latestTree) : new Set<string>();
        const done = targetPaths.reduce((acc, relPath) => {
          return indexedPaths.has(relPath) ? acc + 1 : acc;
        }, 0);
        setIndexingActivePath(null);
        setIndexingTargets(new Set());
        setInfo(`Indexierung abgeschlossen. (${done}/${totalTargets})`);
      } else {
        throw new Error(finalStatus.message || "Indexierung fehlgeschlagen.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIndexingActivePath(null);
      setIndexingTargets(new Set());
    } finally {
      setBusyPath(null);
      setTimeout(() => setInfo(null), 4000);
    }
  };

  const handleIndexAll = async () => {
    setGlobalIndexResult(null);

    const latestTree = tree ?? (await refresh());
    if (!latestTree) return;

    const targetPaths = collectUnindexedPaths(latestTree);
    if (!targetPaths.length) {
      setGlobalIndexResult({ success: true, message: "Alles bereits indexiert" });
      setTimeout(() => setGlobalIndexResult(null), 4000);
      return;
    }

    setGlobalIndexing(true);
    setError(null);
    setIndexingTargets(new Set(targetPaths));
    setIndexingActivePath(targetPaths[0] ?? null);

    const totalTargets = targetPaths.length;
    setInfo(`Indexierung gestartet... (0/${totalTargets})`);

    try {
      const res = await fetch("/api/jobs/index-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || data.message || "Indexierung konnte nicht gestartet werden");
      }

      const finalStatus = await waitForIndexJob((_status, polledTree) => {
        if (!polledTree) return;
        const indexedPaths = collectIndexedPathSet(polledTree);
        const pending = targetPaths.filter((relPath) => !indexedPaths.has(relPath));
        const done = totalTargets - pending.length;
        setIndexingActivePath(pending[0] ?? null);
        setInfo(`Indexierung laeuft... (${done}/${totalTargets})`);
      });

      if (!finalStatus) {
        setGlobalIndexResult({ success: true, message: "Laeuft im Hintergrund" });
        setInfo("Indexierung laeuft weiterhin im Hintergrund.");
        return;
      }

      if (finalStatus.success) {
        const finishedTree = await refresh();
        const indexedPaths = finishedTree ? collectIndexedPathSet(finishedTree) : new Set<string>();
        const done = targetPaths.reduce((acc, relPath) => {
          return indexedPaths.has(relPath) ? acc + 1 : acc;
        }, 0);
        setGlobalIndexResult({ success: true, message: "Indexierung abgeschlossen" });
        setInfo(`Indexierung abgeschlossen. (${done}/${totalTargets})`);
      } else {
        throw new Error(finalStatus.message || "Indexierung fehlgeschlagen.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGlobalIndexResult({ success: false, message: "Indexierung fehlgeschlagen" });
    } finally {
      setGlobalIndexing(false);
      setIndexingActivePath(null);
      setIndexingTargets(new Set());
      setTimeout(() => setGlobalIndexResult(null), 4000);
      setTimeout(() => setInfo(null), 4000);
    }
  };

  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(node));
  };

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOver(folderPath);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json")) as TreeNode;
      if (data.path === targetFolderPath) return; // Can't move to itself
      if (data.path && targetFolderPath.startsWith(data.path + "/")) return; // Can't move folder into itself

      await handleMoveItem(data.path, targetFolderPath);
    } catch (err) {
      console.error("Drop failed:", err);
    }
  };

  if (!tree) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-slate-200">
        {error ? (
          <div className="text-sm text-red-200">Fehler: {error}</div>
        ) : (
          <div className="text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Lade Ordnerstruktur…
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 overflow-hidden backdrop-blur-lg">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Dokumentenstruktur</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin ? "Rechtsklick für Optionen • Drag & Drop zum Verschieben" : "Nur-Lesen Modus"}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal({ type: "create", parentPath: "" })}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0077DD]/20 border border-[#0077DD]/30 text-xs font-semibold text-[#0077DD] hover:bg-[#0077DD]/30 hover:border-[#0077DD]/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              Neuer Ordner
            </button>
          )}
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {info && (
          <div className="px-5 py-3 bg-[#0077DD]/10 border-b border-[#0077DD]/20 text-sm text-[#99CCFF]">
            {info}
          </div>
        )}

        <div className="px-3 py-3 max-h-[600px] overflow-y-auto">
          <TreeItem
            node={tree}
            depth={0}
            open={open}
            busyPath={busyPath}
            dragOver={dragOver}
            indexingTargets={indexingTargets}
            indexingActivePath={indexingActivePath}
            isAdmin={isAdmin}
            onToggle={toggleFolder}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {folders.length - 1} Ordner • {tree.children?.filter((c) => c.type === "file").length || 0}{" "}
            Dateien (root)
          </span>
          {isAdmin && (
            <div className="relative">
              <button
                onClick={handleIndexAll}
                disabled={globalIndexing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0077DD]/20 border border-[#0077DD]/30 text-xs font-semibold text-[#0077DD] hover:bg-[#0077DD]/30 disabled:opacity-50 transition-all"
                title="Dateien indexieren"
              >
                {globalIndexing ? (
                  <div className="w-3 h-3 border-2 border-[#0077DD]/30 border-t-[#0077DD] rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>Index</span>
              </button>

              {globalIndexResult && (
                <div
                  className={`absolute top-full right-0 mt-2 px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-xl z-10 ${
                    globalIndexResult.success
                      ? "bg-[#0077DD]/90 text-white"
                      : "bg-slate-500/90 text-white"
                  }`}
                >
                  {globalIndexResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {contextMenu && isAdmin && (
        <ContextMenu
          menu={contextMenu}
          onIndexUnindexed={() => {
            handleIndexUnindexed(contextMenu.node.path, contextMenu.unindexedPaths);
            setContextMenu(null);
          }}
          onCreateSubfolder={() => {
            setModal({ type: "create", parentPath: contextMenu.node.path });
            setContextMenu(null);
          }}
          onRename={() => {
            setModal({ type: "rename", node: contextMenu.node });
            setContextMenu(null);
          }}
          onDelete={() => {
            setModal({ type: "delete", node: contextMenu.node });
            setContextMenu(null);
          }}
          onMove={() => {
            setModal({ type: "move", node: contextMenu.node, folders });
            setContextMenu(null);
          }}
        />
      )}

      {modal?.type === "create" && (
        <CreateFolderModal
          parentPath={modal.parentPath}
          onConfirm={(name) => {
            handleCreateFolder(modal.parentPath, name);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "rename" && (
        <RenameFolderModal
          currentName={modal.node.name}
          onConfirm={(name) => {
            handleRenameFolder(modal.node.path, name);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteModal
          node={modal.node}
          onConfirm={() => {
            if (modal.node.type === "folder") {
              handleDeleteFolder(modal.node.path);
            } else {
              handleDeleteFile(modal.node.path);
            }
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === "move" && (
        <MoveModal
          node={modal.node}
          folders={modal.folders}
          onConfirm={(targetDir) => {
            handleMoveItem(modal.node.path, targetDir);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

function TreeItem({
  node,
  depth,
  open,
  busyPath,
  dragOver,
  indexingTargets,
  indexingActivePath,
  isAdmin,
  onToggle,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: TreeNode;
  depth: number;
  open: Set<string>;
  busyPath: string | null;
  dragOver: string | null;
  indexingTargets: Set<string>;
  indexingActivePath: string | null;
  isAdmin: boolean;
  onToggle: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onDragStart: (e: React.DragEvent, node: TreeNode) => void;
  onDragOver: (e: React.DragEvent, folderPath: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetFolderPath: string) => void;
}) {
  const indent = depth * 20;
  const isOpen = node.type === "folder" ? open.has(node.path) : false;
  const isBusy = busyPath === node.path;
  const isDragOver = dragOver === node.path;

  if (node.type === "folder") {
    return (
      <div>
        <div
          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer ${
            isDragOver ? "bg-[#0077DD]/20 ring-2 ring-[#0077DD]/50" : ""
          } ${isBusy ? "opacity-50" : ""}`}
          style={{ paddingLeft: 8 + indent }}
          onClick={() => onToggle(node.path)}
          onContextMenu={isAdmin ? (e) => onContextMenu(e, node) : undefined}
          draggable={isAdmin && !!node.path}
          onDragStart={isAdmin ? (e) => onDragStart(e, node) : undefined}
          onDragOver={isAdmin ? (e) => onDragOver(e, node.path) : undefined}
          onDragLeave={isAdmin ? onDragLeave : undefined}
          onDrop={isAdmin ? (e) => onDrop(e, node.path) : undefined}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
          {isOpen ? (
            <FolderOpen className="w-4 h-4 text-[#0077DD]" />
          ) : (
            <Folder className="w-4 h-4 text-[#0077DD]" />
          )}
          <span className="text-sm font-medium text-slate-100 flex-1">
            {node.path ? node.name : "data/sources"}
          </span>
          {isBusy && (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
        </div>

        {isOpen &&
          (node.children ?? []).map((child) => (
            <TreeItem
              key={`${child.type}:${child.path}`}
              node={child}
              depth={depth + 1}
              open={open}
              busyPath={busyPath}
              dragOver={dragOver}
              indexingTargets={indexingTargets}
              indexingActivePath={indexingActivePath}
              isAdmin={isAdmin}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
      </div>
    );
  }

  const href = `/documents/${encodePathSegments(node.path)}`;
  const isIndexingActive = indexingActivePath === node.path;
  const isIndexingQueued =
    !node.indexed && !isIndexingActive && indexingTargets.has(node.path);

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all ${
        isBusy ? "opacity-50" : ""
      }`}
      style={{ paddingLeft: 28 + indent }}
      draggable={isAdmin}
      onDragStart={isAdmin ? (e) => onDragStart(e, node) : undefined}
      onContextMenu={isAdmin ? (e) => onContextMenu(e, node) : undefined}
    >
      <FileText className={`w-4 h-4 ${node.indexed ? "text-slate-400" : "text-slate-600"}`} />
      <Link
        href={href}
        className={`flex-1 text-sm transition-colors truncate ${
          node.indexed
            ? "text-slate-200 hover:text-[#0077DD]"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        {node.name}
      </Link>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded border ${
          isIndexingActive
            ? "border-[#0077DD]/60 text-[#99CCFF]"
            : isIndexingQueued
            ? "border-slate-600 text-slate-400"
            : node.indexed
            ? "border-emerald-700/60 text-emerald-300/90"
            : "border-slate-600 text-slate-500"
        }`}
      >
        {isIndexingActive
          ? "indexiert..."
          : isIndexingQueued
          ? "wartet"
          : node.indexed
          ? "indexiert"
          : "nicht indexiert"}
      </span>
      {(isBusy || isIndexingActive) && (
        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
    </div>
  );
}

function ContextMenu({
  menu,
  onIndexUnindexed,
  onCreateSubfolder,
  onRename,
  onDelete,
  onMove,
}: {
  menu: ContextMenuType;
  onIndexUnindexed: () => void;
  onCreateSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
}) {
  return (
    <div
      className="fixed z-50 w-56 bg-[#2a2a2a] border border-white/15 rounded-xl shadow-2xl shadow-black/50 py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {menu.unindexedPaths.length > 0 && (
        <>
          <button
            onClick={onIndexUnindexed}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#99CCFF] hover:bg-[#0077DD]/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Nicht indexierte Dateien indexieren ({menu.unindexedPaths.length})
          </button>
          <div className="h-px bg-white/10 my-1" />
        </>
      )}

      {menu.type === "folder" && menu.node.path && (
        <button
          onClick={onCreateSubfolder}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-100 hover:bg-white/10 transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          Unterordner erstellen
        </button>
      )}

      {menu.node.path && (
        <>
          <button
            onClick={onRename}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-100 hover:bg-white/10 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Umbenennen
          </button>

          <button
            onClick={onMove}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-100 hover:bg-white/10 transition-colors"
          >
            <Move className="w-4 h-4" />
            Verschieben
          </button>

          <div className="h-px bg-white/10 my-1" />

          <button
            onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Löschen
          </button>
        </>
      )}
    </div>
  );
}

function CreateFolderModal({
  parentPath,
  onConfirm,
  onCancel,
}: {
  parentPath: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name);
    }
  };

  return (
    <ModalBackdrop onClose={onCancel}>
      <div className="bg-[#2a2a2a] border border-white/15 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-white mb-4">Neuen Ordner erstellen</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Ordnername {parentPath && <span className="text-slate-500">in {parentPath}</span>}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Beratung"
              autoFocus
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0077DD] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

function RenameFolderModal({
  currentName,
  onConfirm,
  onCancel,
}: {
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(currentName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name !== currentName) {
      onConfirm(name);
    }
  };

  return (
    <ModalBackdrop onClose={onCancel}>
      <div className="bg-[#2a2a2a] border border-white/15 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-white mb-4">Umbenennen</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Neuer Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name === currentName}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0077DD] text-white hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Umbenennen
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

function DeleteModal({
  node,
  onConfirm,
  onCancel,
}: {
  node: TreeNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalBackdrop onClose={onCancel}>
      <div className="bg-[#2a2a2a] border border-white/15 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-white mb-4">
          {node.type === "folder" ? "Ordner löschen?" : "Datei löschen?"}
        </h3>
        <p className="text-sm text-slate-300 mb-6">
          Möchten Sie <span className="font-semibold text-white">{node.name}</span> wirklich
          löschen?
          {node.type === "folder" && (
            <span className="block mt-2 text-red-300">
              ⚠️ Alle Unterordner und Dateien werden ebenfalls gelöscht!
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
    </ModalBackdrop>
  );
}

function MoveModal({
  node,
  folders,
  onConfirm,
  onCancel,
}: {
  node: TreeNode;
  folders: string[];
  onConfirm: (targetDir: string) => void;
  onCancel: () => void;
}) {
  const [selectedFolder, setSelectedFolder] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedFolder);
  };

  const availableFolders = folders.filter((f) => {
    // Can't move to itself or into its own children
    if (node.type === "folder" && (f === node.path || f.startsWith(node.path + "/"))) {
      return false;
    }
    return true;
  });

  return (
    <ModalBackdrop onClose={onCancel}>
      <div className="bg-[#2a2a2a] border border-white/15 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-white mb-4">Verschieben</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              <span className="font-semibold text-white">{node.name}</span> verschieben nach:
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
              autoFocus
            >
              <option value="">Root (data/sources)</option>
              {availableFolders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0077DD] text-white hover:bg-[#0066C0] transition-all"
            >
              Verschieben
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

