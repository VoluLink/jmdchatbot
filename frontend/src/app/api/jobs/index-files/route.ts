import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend";

export const dynamic = "force-dynamic";

const INDEX_JOB_PATH = "/query/index-job";

function getBackendIndexJobUrl(): string {
  const baseUrl = getBackendBaseUrl();
  return new URL(INDEX_JOB_PATH, `${baseUrl}/`).toString();
}

async function proxyIndexJobRequest(
  method: "GET" | "POST",
  body?: unknown
): Promise<NextResponse> {
  const url = getBackendIndexJobUrl();
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });

  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

// GET - Read indexing job status from backend
export async function GET() {
  try {
    return await proxyIndexJobRequest("GET");
  } catch (error) {
    console.error("Error fetching indexing job status:", error);
    return NextResponse.json(
      { error: "Failed to fetch indexing job status" },
      { status: 500 }
    );
  }
}

// POST - Start indexing job on backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return await proxyIndexJobRequest("POST", body);
  } catch (error) {
    console.error("Error starting indexing job:", error);
    return NextResponse.json(
      { error: "Failed to start indexing job" },
      { status: 500 }
    );
  }
}
