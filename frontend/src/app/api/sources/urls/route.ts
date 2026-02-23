import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "../../document-management/_paths";
import { getBackendBaseUrl } from "@/lib/backend";

type UrlSource = {
  id: string;
  url: string;
  name: string;
  fetchIntervalDays: number; // days
  enabled: boolean;
  lastFetched?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

const URL_SOURCES_PATH = path.join(DATA_DIR, "url_sources.json");

async function readUrlSources(): Promise<UrlSource[]> {
  await fs.mkdir(path.dirname(URL_SOURCES_PATH), { recursive: true });

  try {
    const data = await fs.readFile(URL_SOURCES_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

async function writeUrlSources(sources: UrlSource[]): Promise<void> {
  await fs.mkdir(path.dirname(URL_SOURCES_PATH), { recursive: true });
  await fs.writeFile(URL_SOURCES_PATH, JSON.stringify(sources, null, 2), "utf-8");
}

// GET - List all URL sources
export async function GET() {
  try {
    const sources = await readUrlSources();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error reading URL sources:", error);
    return NextResponse.json({ error: "Failed to read URL sources" }, { status: 500 });
  }
}

// POST - Add new URL source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, name, fetchIntervalDays = 1, enabled = true } = body; // Default: daily

    if (!url || !name) {
      return NextResponse.json({ error: "URL and name are required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const sources = await readUrlSources();

    // Check for duplicate URL
    if (sources.some((s) => s.url === url)) {
      return NextResponse.json({ error: "URL already exists" }, { status: 400 });
    }

    const newSource: UrlSource = {
      id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      name,
      fetchIntervalDays: Math.max(1, fetchIntervalDays), // Minimum 1 day
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sources.push(newSource);
    await writeUrlSources(sources);

    return NextResponse.json({ source: newSource });
  } catch (error) {
    console.error("Error adding URL source:", error);
    return NextResponse.json({ error: "Failed to add URL source" }, { status: 500 });
  }
}

// PATCH - Update URL source
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, url, name, fetchIntervalDays, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const sources = await readUrlSources();
    const index = sources.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "URL source not found" }, { status: 404 });
    }

    // Update fields
    if (url !== undefined) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
      sources[index].url = url;
    }
    if (name !== undefined) sources[index].name = name;
    if (fetchIntervalDays !== undefined) {
      sources[index].fetchIntervalDays = Math.max(1, fetchIntervalDays); // Min 1 day
    }
    if (enabled !== undefined) sources[index].enabled = enabled;

    sources[index].updatedAt = new Date().toISOString();

    await writeUrlSources(sources);

    return NextResponse.json({ source: sources[index] });
  } catch (error) {
    console.error("Error updating URL source:", error);
    return NextResponse.json({ error: "Failed to update URL source" }, { status: 500 });
  }
}

// DELETE - Remove URL source
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const sources = await readUrlSources();
    const source = sources.find((s) => s.id === id);

    if (!source) {
      return NextResponse.json({ error: "URL source not found" }, { status: 404 });
    }

    // Clean up vectors, metadata, and BM25 cache for this URL
    try {
      const baseUrl = getBackendBaseUrl();
      await fetch(`${baseUrl}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [source.url] }),
      });
    } catch (backendErr) {
      console.warn("Failed to clean up URL document from index:", backendErr);
    }

    const filtered = sources.filter((s) => s.id !== id);
    await writeUrlSources(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting URL source:", error);
    return NextResponse.json({ error: "Failed to delete URL source" }, { status: 500 });
  }
}

