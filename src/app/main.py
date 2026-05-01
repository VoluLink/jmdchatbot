from __future__ import annotations

import asyncio
import os
import re
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, TextIO, TypedDict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from llama_index.core.query_engine import CitationQueryEngine
from llama_index.core.prompts import PromptTemplate

from src.config.settings import get_settings
from src.indexing import get_index_manager
from src.retrieval import HybridRetriever, CrossEncoderReranker, QueryTransformer


# System prompt for concise, well-structured responses
SYSTEM_PROMPT = """Du bist ein hilfreicher Assistent für deutsches Aufenthalts- und Asylrecht.

KRITISCHE REGEL: Verwende Zitate [1], [2], [3] NUR wenn die Information aus dem bereitgestellten Kontext stammt.

FORMATIERUNG:
- Strukturiere Antworten mit Aufzählungspunkten (•) oder nummerierten Listen
- Gruppiere zusammengehörige Informationen unter Zwischenüberschriften wenn sinnvoll
- Sei VOLLSTÄNDIG - lass keine wichtigen Details, Voraussetzungen oder Ausnahmen aus
- Alle relevanten Informationen aus dem Kontext sollen enthalten sein

Regeln für deine Antworten:
- Für RECHTLICHE FRAGEN: Antworte NUR basierend auf dem bereitgestellten Kontext
- Für RECHTLICHE INHALTE: Verwende Inline-Zitate [1], [2] für jede Aussage aus den Dokumenten
- Für ALLGEMEINE/META-FRAGEN (z.B. "Wer bist du?"): Darfst du kurz antworten, aber OHNE Zitate
- Falls rechtliche Informationen NICHT im Kontext stehen: "Diese Information finde ich nicht in den vorliegenden Dokumenten."
- Schreibe auf Deutsch
- KEINE Quellenangaben am Ende auflisten (diese werden automatisch angezeigt)

NIEMALS Zitate verwenden wenn:
- Die Frage nicht über Aufenthalts-/Asylrecht ist
- Die Information aus deinem allgemeinen Wissen stammt
- Die Dokumente die Frage nicht beantworten
"""

CITATION_QA_TEMPLATE = PromptTemplate(
    SYSTEM_PROMPT + """

Kontext-Informationen aus den Dokumenten:
---------------------
{context_str}
---------------------

Beantworte die folgende Frage. 
- Wenn die Frage über Aufenthalts-/Asylrecht ist: Nutze NUR den obigen Kontext und zitiere mit [1], [2] etc.
- Wenn die Frage allgemein/meta ist (z.B. über dich): Antworte kurz OHNE Zitate.

Frage: {query_str}

Antwort: """
)


class DeleteDocumentsRequest(BaseModel):
    paths: List[str] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    path_prefixes: List[str] = Field(default_factory=list)


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    temperature: float = 0.7
    chunk_size: int = 512


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]


class IndexJobRequest(BaseModel):
    force: bool = False
    semantic: bool = False
    targetPaths: List[str] = Field(default_factory=list)


class IndexJobState(TypedDict):
    running: bool
    startedAt: Optional[str]
    finishedAt: Optional[str]
    success: Optional[bool]
    exitCode: Optional[int]
    message: Optional[str]
    outputTail: str
    errorTail: str


MAX_TAIL_CHARS = 12000
_index_job_lock = threading.Lock()
_index_job_state: IndexJobState = {
    "running": False,
    "startedAt": None,
    "finishedAt": None,
    "success": None,
    "exitCode": None,
    "message": None,
    "outputTail": "",
    "errorTail": "",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _trim_tail(current: str, chunk: str) -> str:
    """Keep only the last MAX_TAIL_CHARS characters of accumulated output."""
    next_tail = current + chunk
    if len(next_tail) <= MAX_TAIL_CHARS:
        return next_tail
    return next_tail[-MAX_TAIL_CHARS:]


def _normalize_target_paths(target_paths: List[str]) -> List[str]:
    cleaned: List[str] = []
    for rel_path in target_paths:
        if not isinstance(rel_path, str):
            continue
        normalized = rel_path.strip()
        if normalized:
            cleaned.append(normalized)
    return cleaned


def _build_indexer_args(
    force: bool,
    semantic: bool,
    target_paths: List[str],
) -> List[str]:
    if target_paths:
        args: List[str] = ["-m", "src.updater.index_selected"]
        for rel_path in target_paths:
            args.extend(["--path", rel_path])
        if force:
            args.append("--force")
        return args

    args = ["-m", "src.updater.advanced_jobs"]
    if force:
        args.append("--force")
    if semantic:
        args.append("--semantic")
    return args


def _repo_root() -> Path:
    # src/app/main.py -> repo root is two levels up.
    return Path(__file__).resolve().parents[2]


def _capture_process_stream(
    stream: Optional[TextIO],
    state_key: Literal["outputTail", "errorTail"],
) -> None:
    """Read a subprocess stream in a daemon thread and append to job state."""
    if stream is None:
        return
    try:
        for chunk in stream:
            with _index_job_lock:
                _index_job_state[state_key] = _trim_tail(_index_job_state[state_key], chunk)
    finally:
        stream.close()


def _watch_index_process(process: subprocess.Popen[str]) -> None:
    """Wait for the indexing subprocess and record its exit status."""
    exit_code = process.wait()
    with _index_job_lock:
        _index_job_state["running"] = False
        _index_job_state["finishedAt"] = _utc_now_iso()
        _index_job_state["success"] = exit_code == 0
        _index_job_state["exitCode"] = exit_code
        _index_job_state["message"] = (
            "Indexierung abgeschlossen."
            if exit_code == 0
            else "Indexierung fehlgeschlagen."
        )


settings = get_settings()
index_manager = get_index_manager()

_reranker_cache = None
def get_reranker():
    """Return the cached reranker, lazily loading the model on first call."""
    global _reranker_cache
    if _reranker_cache is None and settings.use_reranker:
        _reranker_cache = CrossEncoderReranker(
            model_name=settings.reranker_model,
            top_n=5,
        )
        _reranker_cache._load_model()  # warm up to avoid first-query latency
    return _reranker_cache

app = FastAPI(
    title="RAG Seminararbeit – LlamaIndex API",
    description="Query service for a modular RAG pipeline.",
    version="0.1.0",
)

@app.on_event("startup")
async def startup_event():
    """Preload models on startup to avoid cold start delay."""
    print("Preloading models...")
    get_reranker()
    print("Models ready!")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_response(text: str) -> str:
    """Strip source-list sections the LLM sometimes appends (the UI shows sources separately)."""
    patterns = [
        r'\n\s*Quellen:.*$',
        r'\n\s*Sources:.*$',
        r'\n\s*Referenzen:.*$',
        r'\n\s*Quellenangaben:.*$',
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    return text.strip()


@app.get("/")
async def root() -> Dict[str, str]:
    """
    Simple landing endpoint so the API root doesn't return 404 in the browser.
    """
    return {
        "message": "RAG API is running. See /docs for Swagger UI, /health for status, and POST /query for querying.",
    }


@app.get("/favicon.ico")
async def favicon() -> None:
    """
    Avoid noisy 404s from browsers requesting /favicon.ico.
    """
    return None


@app.get("/health")
async def health() -> Dict[str, Any]:
    """
    Healthcheck-Endpoint with retrieval info.
    """
    nodes_count = len(index_manager.get_all_nodes())
    return {
        "status": "ok",
        "embedding_model": settings.embedding_model,
        "chunk_size": settings.chunk_size,
        "hybrid_search": settings.use_hybrid_search,
        "hybrid_active": settings.use_hybrid_search and nodes_count > 0,
        "bm25_weight": settings.bm25_weight if settings.use_hybrid_search else None,
        "reranker": settings.use_reranker,
        "reranker_model": settings.reranker_model if settings.use_reranker else None,
        "query_transform": settings.use_query_transform,
        "query_transform_strategy": settings.query_transform_strategy if settings.use_query_transform else None,
        "cached_nodes": nodes_count,
    }


@app.delete("/documents")
async def delete_documents(req: DeleteDocumentsRequest) -> Dict[str, Any]:
    """
    Delete documents from the vector DB, metadata, and BM25 cache.

    Accepts file paths, URLs, or path prefixes (for folder deletion).
    """
    if not req.paths and not req.urls and not req.path_prefixes:
        raise HTTPException(
            status_code=400,
            detail="At least one of 'paths', 'urls', or 'path_prefixes' must be provided.",
        )

    total_deleted = 0

    for file_path in req.paths:
        total_deleted += index_manager.delete_documents_by_path(file_path)

    for prefix in req.path_prefixes:
        total_deleted += index_manager.delete_documents_by_prefix(prefix)

    for url in req.urls:
        total_deleted += index_manager.delete_documents_by_url(url)

    return {
        "success": True,
        "deleted": total_deleted,
        "message": f"{total_deleted} document(s) removed from index.",
    }


@app.get("/query/index-job")
async def get_index_job_status() -> Dict[str, Any]:
    with _index_job_lock:
        return dict(_index_job_state)


@app.post("/query/index-job")
async def start_index_job(req: IndexJobRequest) -> JSONResponse:
    target_paths = _normalize_target_paths(req.targetPaths)

    if req.targetPaths and not target_paths:
        return JSONResponse(
            {"error": "No valid target paths provided"},
            status_code=400,
        )

    with _index_job_lock:
        if _index_job_state["running"]:
            return JSONResponse(
                {
                    "success": False,
                    "running": True,
                    "message": "Indexierung laeuft bereits.",
                },
                status_code=409,
            )

    args = _build_indexer_args(req.force, req.semantic, target_paths)
    command = [sys.executable, *args]

    # Force UTF-8 in the child process so Emojis/Unicode in print()
    child_env = os.environ.copy()
    child_env["PYTHONIOENCODING"] = "utf-8"
    child_env["PYTHONUTF8"] = "1"

    try:
        process = subprocess.Popen(
            command,
            cwd=str(_repo_root()),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            env=child_env,
        )
    except Exception as exc:
        return JSONResponse(
            {"error": f"Failed to start indexing job: {exc}"},
            status_code=500,
        )

    with _index_job_lock:
        _index_job_state["running"] = True
        _index_job_state["startedAt"] = _utc_now_iso()
        _index_job_state["finishedAt"] = None
        _index_job_state["success"] = None
        _index_job_state["exitCode"] = None
        _index_job_state["message"] = (
            "Gezielte Indexierung gestartet."
            if target_paths
            else "Indexierung gestartet."
        )
        _index_job_state["outputTail"] = ""
        _index_job_state["errorTail"] = ""

    threading.Thread(
        target=_capture_process_stream,
        args=(process.stdout, "outputTail"),
        daemon=True,
    ).start()
    threading.Thread(
        target=_capture_process_stream,
        args=(process.stderr, "errorTail"),
        daemon=True,
    ).start()
    threading.Thread(
        target=_watch_index_process,
        args=(process,),
        daemon=True,
    ).start()

    return JSONResponse(
        {
            "success": True,
            "running": True,
            "message": (
                "Gezielte Indexierung wurde im Hintergrund gestartet."
                if target_paths
                else "Indexierung wurde im Hintergrund gestartet."
            ),
        },
        status_code=202,
    )


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    """
    Query the RAG index.

    Returns a generated answer with inline citations.
    """

    index = index_manager.index

    from llama_index.llms.openai import OpenAI
    llm = OpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        temperature=req.temperature,
    )

    reranker = get_reranker() if settings.use_reranker else None

    # HyDE generates a hypothetical answer to improve semantic matching
    query_transformer = None
    if settings.use_query_transform:
        query_transformer = QueryTransformer(
            llm=llm,
            strategy=settings.query_transform_strategy,
            language="german",
        )

    # Build hybrid retriever when enabled and nodes are cached, else vector-only
    retriever = None
    if settings.use_hybrid_search:
        nodes = index_manager.get_all_nodes()
        if nodes:
            retriever = HybridRetriever(
                vector_index=index,
                nodes=nodes,
                similarity_top_k=req.top_k,
                bm25_weight=settings.bm25_weight,
                reranker=reranker,
                query_transformer=query_transformer,
            )

    if retriever is not None:
        query_engine = CitationQueryEngine.from_args(
            index,
            retriever=retriever,
            llm=llm,
            citation_chunk_size=req.chunk_size,
            citation_qa_template=CITATION_QA_TEMPLATE,
        )
    else:
        query_engine = CitationQueryEngine.from_args(
            index,
            similarity_top_k=req.top_k,
            llm=llm,
            citation_chunk_size=req.chunk_size,
            citation_qa_template=CITATION_QA_TEMPLATE,
        )

    try:
        # LlamaIndex query is synchronous, so run it in a thread
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, query_engine.query, req.question)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    answer_text = clean_response(str(response))
    cited_numbers = set(re.findall(r'\[(\d+)\]', answer_text))
    
    sources: List[Dict[str, Any]] = []
    for idx, node in enumerate(getattr(response, "source_nodes", []) or []):
        citation_num = idx + 1
        
        # Only include sources actually cited in the answer
        if str(citation_num) not in cited_numbers:
            continue

        metadata = node.metadata or {}
        path = metadata.get("path") or metadata.get("file_path") or ""
        filename = path.split("\\")[-1].split("/")[-1] if path else f"Quelle {citation_num}"
        
        sources.append(
            {
                "id": citation_num,  # Citation number [1], [2], etc.
                "score": getattr(node, "score", None),
                "source": metadata.get("source"),
                "path": path,
                "filename": filename,
                "url": metadata.get("url"),
            }
        )

    return QueryResponse(answer=answer_text, sources=sources)

