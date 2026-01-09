import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { resolveUnderSources } from "../_paths";

type TreeNode = {
  name: string;
  path: string; // relative (posix) path from sources root
  type: "folder" | "file";
  children?: TreeNode[];
};

async function buildTree(relDir: string): Promise<TreeNode> {
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
      children.push(await buildTree(childRel));
    } else if (entry.isFile()) {
      children.push({
        name: entry.name,
        path: childRel,
        type: "file",
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
    const tree = await buildTree("");
    return NextResponse.json({ tree });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


