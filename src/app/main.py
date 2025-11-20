from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.config.settings import get_settings
from src.indexing import get_index_manager


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]


settings = get_settings()
index_manager = get_index_manager()

app = FastAPI(
    title="RAG Seminararbeit – LlamaIndex API",
    description="Einfacher Query-Service für eine modulare RAG-Pipeline.",
    version="0.1.0",
)


@app.get("/health")
async def health() -> Dict[str, str]:
    """
    Healthcheck-Endpoint.
    """

    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    """
    Stelle eine Frage an den RAG-Index.

    Antwortet mit generiertem Text und den wichtigsten Quellen.
    """

    index = index_manager.index
    query_engine = index.as_query_engine(similarity_top_k=req.top_k)

    try:
        # LlamaIndex ist synchron, daher in Thread ausführen.
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, query_engine.query, req.question)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Antwort und Quellen extrahieren.
    answer_text = str(response)
    sources: List[Dict[str, Any]] = []
    for node in getattr(response, "source_nodes", []) or []:
        metadata = node.metadata or {}
        sources.append(
            {
                "score": getattr(node, "score", None),
                "source": metadata.get("source"),
                "path": metadata.get("path"),
                "url": metadata.get("url"),
            }
        )

    return QueryResponse(answer=answer_text, sources=sources)

