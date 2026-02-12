import path from "path";

const resolvedDataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "..", "data");

export const DATA_DIR = resolvedDataDir;
export const SOURCES_DIR = process.env.LOCAL_DATA_DIR
  ? path.resolve(process.env.LOCAL_DATA_DIR)
  : path.join(DATA_DIR, "sources");

export function normalizeRelPath(relPath: string) {
  const normalized = (relPath ?? "").replace(/\\/g, "/");
  const clean = path.posix.normalize(normalized).replace(/^(\.\/)+/, "");

  if (clean === "." || clean === "/") return "";
  if (path.posix.isAbsolute(clean)) {
    throw new Error("Absolute paths are not allowed");
  }
  if (clean.split("/").some((seg) => seg === "..")) {
    throw new Error("Path traversal is not allowed");
  }
  return clean;
}

export function resolveUnderSources(relPath: string) {
  const cleanRel = normalizeRelPath(relPath);

  const absBase = path.resolve(SOURCES_DIR);
  const absTarget = path.resolve(SOURCES_DIR, cleanRel);

  const baseLower = absBase.toLowerCase();
  const targetLower = absTarget.toLowerCase();
  const prefix = baseLower.endsWith(path.sep.toLowerCase())
    ? baseLower
    : baseLower + path.sep.toLowerCase();

  if (!(targetLower === baseLower || targetLower.startsWith(prefix))) {
    throw new Error("Access denied");
  }

  return { absBase, absTarget, cleanRel };
}


