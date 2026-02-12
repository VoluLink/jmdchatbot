import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { jwtVerify } from "jose";
import { DATA_DIR } from "../document-management/_paths";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const REQUESTS_FILE = path.join(DATA_DIR, "document_requests.json");

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

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    return null;
  }
}

async function ensureRequestsFile() {
  await fs.mkdir(path.dirname(REQUESTS_FILE), { recursive: true });

  try {
    await fs.access(REQUESTS_FILE);
  } catch {
    await fs.writeFile(REQUESTS_FILE, JSON.stringify([]));
  }
}

async function getRequests(): Promise<DocumentRequest[]> {
  await ensureRequestsFile();
  const content = await fs.readFile(REQUESTS_FILE, "utf-8");
  return JSON.parse(content);
}

async function saveRequests(requests: DocumentRequest[]) {
  await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2));
}

// GET - Get all document requests (admin only) or user's own requests
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const requests = await getRequests();

    // Admins can see all requests, users can only see their own
    if (user.role === "admin") {
      return NextResponse.json({ requests });
    } else {
      const userRequests = requests.filter((r) => r.userId === user.userId);
      return NextResponse.json({ requests: userRequests });
    }
  } catch (error) {
    console.error("Error getting document requests:", error);
    return NextResponse.json(
      { error: "Failed to get document requests" },
      { status: 500 }
    );
  }
}

// POST - Create a new document request
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const type = formData.get("type") as "text" | "file";
    const description = (formData.get("description") as string) || "";

    if (!type || !["text", "file"].includes(type)) {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    let fileName: string | undefined;
    let filePath: string | undefined;

    if (type === "file") {
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }

      // Save the file to a temporary location
      const uploadsDir = path.join(process.cwd(), "..", "data", "document_request_uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const timestamp = Date.now();
      fileName = file.name;
      const safeFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      filePath = path.join(uploadsDir, safeFileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);
    } else if (!description.trim()) {
      return NextResponse.json(
        { error: "Description is required for text requests" },
        { status: 400 }
      );
    }

    const requests = await getRequests();

    const newRequest: DocumentRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: user.userId as string,
      userEmail: user.email as string,
      userName: (user.name as string) || "Unknown",
      type,
      description,
      fileName,
      filePath: filePath ? path.relative(path.join(process.cwd(), ".."), filePath) : undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requests.push(newRequest);
    await saveRequests(requests);

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error) {
    console.error("Error creating document request:", error);
    return NextResponse.json(
      { error: "Failed to create document request" },
      { status: 500 }
    );
  }
}

// PATCH - Update request status (admin only)
export async function PATCH(request: NextRequest) {
  const user = await getUserFromToken(request);

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status || !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const requests = await getRequests();
    const requestIndex = requests.findIndex((r) => r.id === requestId);

    if (requestIndex === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    requests[requestIndex].status = status;
    requests[requestIndex].updatedAt = new Date().toISOString();

    await saveRequests(requests);

    return NextResponse.json({ success: true, request: requests[requestIndex] });
  } catch (error) {
    console.error("Error updating document request:", error);
    return NextResponse.json(
      { error: "Failed to update document request" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a request (admin only)
export async function DELETE(request: NextRequest) {
  const user = await getUserFromToken(request);

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 });
    }

    const requests = await getRequests();
    const requestIndex = requests.findIndex((r) => r.id === requestId);

    if (requestIndex === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const deletedRequest = requests[requestIndex];

    // Delete associated file if it exists
    if (deletedRequest.filePath) {
      const fullPath = path.join(process.cwd(), "..", deletedRequest.filePath);
      try {
        await fs.unlink(fullPath);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    requests.splice(requestIndex, 1);
    await saveRequests(requests);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document request:", error);
    return NextResponse.json(
      { error: "Failed to delete document request" },
      { status: 500 }
    );
  }
}
