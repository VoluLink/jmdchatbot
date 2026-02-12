import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

type IndexJobState = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  success: boolean | null;
  exitCode: number | null;
  message: string | null;
  outputTail: string;
  errorTail: string;
};

const MAX_TAIL_CHARS = 12000;

const globalForIndexJob = globalThis as typeof globalThis & {
  __indexJobState?: IndexJobState;
};

function trimTail(current: string, chunk: string): string {
  const next = current + chunk;
  if (next.length <= MAX_TAIL_CHARS) {
    return next;
  }
  return next.slice(next.length - MAX_TAIL_CHARS);
}

function getState(): IndexJobState {
  if (!globalForIndexJob.__indexJobState) {
    globalForIndexJob.__indexJobState = {
      running: false,
      startedAt: null,
      finishedAt: null,
      success: null,
      exitCode: null,
      message: null,
      outputTail: "",
      errorTail: "",
    };
  }
  return globalForIndexJob.__indexJobState;
}

// GET - Read indexing job status
export async function GET() {
  const state = getState();
  return NextResponse.json({
    running: state.running,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    success: state.success,
    exitCode: state.exitCode,
    message: state.message,
  });
}

// POST - Start indexing in background
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { force = false, semantic = false, targetPaths = [] } = body as {
      force?: boolean;
      semantic?: boolean;
      targetPaths?: string[];
    };

    const state = getState();

    if (state.running) {
      return NextResponse.json(
        {
          success: false,
          running: true,
          message: "Indexierung laeuft bereits.",
        },
        { status: 409 }
      );
    }

    const hasTargets = Array.isArray(targetPaths) && targetPaths.length > 0;

    const args = hasTargets
      ? ["-m", "src.updater.index_selected"]
      : ["-m", "src.updater.advanced_jobs"];

    if (hasTargets) {
      for (const relPath of targetPaths) {
        if (typeof relPath !== "string" || !relPath.trim()) continue;
        args.push("--path", relPath.trim());
      }
      if (force) args.push("--force");

      if (args.length <= 2) {
        return NextResponse.json(
          { error: "No valid target paths provided" },
          { status: 400 }
        );
      }
    } else {
      if (force) args.push("--force");
      if (semantic) args.push("--semantic");
    }

    const pythonProcess = spawn("python", args, {
      cwd: path.join(process.cwd(), ".."),
    });

    state.running = true;
    state.startedAt = new Date().toISOString();
    state.finishedAt = null;
    state.success = null;
    state.exitCode = null;
    state.message = hasTargets
      ? "Gezielte Indexierung gestartet."
      : "Indexierung gestartet.";
    state.outputTail = "";
    state.errorTail = "";

    pythonProcess.stdout?.on("data", (data) => {
      state.outputTail = trimTail(state.outputTail, data.toString());
    });

    pythonProcess.stderr?.on("data", (data) => {
      state.errorTail = trimTail(state.errorTail, data.toString());
    });

    pythonProcess.on("error", (error) => {
      state.running = false;
      state.finishedAt = new Date().toISOString();
      state.success = false;
      state.exitCode = null;
      state.message = `Indexierung konnte nicht gestartet werden: ${error.message}`;
    });

    pythonProcess.on("close", (code) => {
      state.running = false;
      state.finishedAt = new Date().toISOString();
      state.success = code === 0;
      state.exitCode = code;
      state.message =
        code === 0 ? "Indexierung abgeschlossen." : "Indexierung fehlgeschlagen.";
    });

    return NextResponse.json(
      {
        success: true,
        running: true,
        message: hasTargets
          ? "Gezielte Indexierung wurde im Hintergrund gestartet."
          : "Indexierung wurde im Hintergrund gestartet.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error starting indexing job:", error);
    return NextResponse.json(
      { error: "Failed to start indexing job" },
      { status: 500 }
    );
  }
}
