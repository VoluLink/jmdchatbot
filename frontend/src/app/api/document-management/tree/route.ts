import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { DATA_DIR, resolveUnderSources } from "../_paths";

export const dynamic = "force-dynamic";

type TreeNode = {
  name: string;
  path: string; // relative (posix) path from sources root
  type: "folder" | "file";
  indexed?: boolean;
  children?: TreeNode[];
};

function normalizeFsPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function toIndexedAbsolutePath(
  rawPath: string,
  absSourcesRoot: string
): string | null {
  const raw = (rawPath || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();

  const root = normalizeFsPath(path.resolve(absSourcesRoot));
  const rootWithSlash = root.endsWith("/") ? root : `${root}/`;

  // If metadata already points to current sources root, use it as-is.
  const normalizedAbs = normalizeFsPath(normalized);
  if (normalizedAbs === root || normalizedAbs.startsWith(rootWithSlash)) {
    return normalizedAbs;
  }

  // Handle moved deployments by extracting path tail after /data/sources/.
  const marker = "/data/sources/";
  const markerIdx = lower.indexOf(marker);
  if (markerIdx >= 0) {
    const rel = normalized.slice(markerIdx + marker.length).replace(/^\/+/, "");
    if (rel) return normalizeFsPath(path.resolve(absSourcesRoot, rel));
  }

  // Handle relative paths stored as "data/sources/..." or plain relative paths.
  if (lower.startsWith("data/sources/")) {
    const rel = normalized.slice("data/sources/".length);
    return normalizeFsPath(path.resolve(absSourcesRoot, rel));
  }

  const looksAbsolute = path.isAbsolute(normalized) || /^[a-zA-Z]:\//.test(normalized);
  if (!looksAbsolute) {
    return normalizeFsPath(path.resolve(absSourcesRoot, normalized.replace(/^\/+/, "")));
  }

  return null;
}

function pathFromDocId(docId: string): string {
  return docId.replace(/_part_\d+$/i, "");
}

async function loadIndexedLocalPaths(absSourcesRoot: string): Promise<Set<string>> {
  const indexedPaths = new Set<string>();
  const metadataPath = path.join(DATA_DIR, "doc_metadata.json");

  try {
    const raw = await fs.readFile(metadataPath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;

    for (const [docId, value] of Object.entries(parsed || {})) {
      const source = String(value?.source ?? "");
      const rawPath = String(value?.path ?? "");
      if (source !== "local") continue;

      const candidates = [rawPath, pathFromDocId(docId)];
      for (const candidate of candidates) {
        const resolved = toIndexedAbsolutePath(candidate, absSourcesRoot);
        if (resolved) indexedPaths.add(resolved);
      }
    }
  } catch {
    // No metadata yet or invalid JSON -> treat all files as unindexed.
  }

  return indexedPaths;
}

async function buildTree(relDir: string, indexedPaths: Set<string>): Promise<TreeNode> {
  const { absTarget } = resolveUnderSources(relDir);
  const entries = await fs.readdir(absTarget, { withFileTypes: true });

  const children: TreeNode[] = [];

  for (const entry of entries) {
    // Skip common junk
    if (entry.name === ".DS_Store") continue;

    const childRel = relDir
      ? path.posix.join(relDir.replace(/\\/g, "/"), entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      children.push(await buildTree(childRel, indexedPaths));
    } else if (entry.isFile()) {
      const absChild = path.resolve(absTarget, entry.name);
      children.push({
        name: entry.name,
        path: childRel,
        type: "file",
        indexed: indexedPaths.has(normalizeFsPath(absChild)),
      });
    }
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    name: relDir ? path.posix.basename(relDir) : "sources",
    path: relDir,
    type: "folder",
    children,
  };
}

export async function GET() {
  try {
    const { absTarget: rootDir } = resolveUnderSources("");
    await fs.mkdir(rootDir, { recursive: true });

    const indexedPaths = await loadIndexedLocalPaths(rootDir);
    const tree = await buildTree("", indexedPaths);
    return NextResponse.json({ tree });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


