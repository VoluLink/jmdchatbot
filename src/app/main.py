from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llama_index.core.query_engine import CitationQueryEngine
from llama_index.core.prompts import PromptTemplate

from src.config.settings import get_settings
from src.indexing import get_index_manager


# System prompt for concise, well-structured responses
SYSTEM_PROMPT = """Du bist ein hilfreicher Assistent für deutsches Aufenthalts- und Asylrecht.

KRITISCHE REGEL: Verwende Zitate [1], [2], [3] NUR wenn die Information aus dem bereitgestellten Kontext stammt.

Regeln für deine Antworten:
- Für RECHTLICHE FRAGEN: Antworte NUR basierend auf dem bereitgestellten Kontext
- Für RECHTLICHE INHALTE: Verwende Inline-Zitate [1], [2] für jede Aussage aus den Dokumenten
- Für ALLGEMEINE/META-FRAGEN (z.B. "Wer bist du?"): Darfst du kurz antworten, aber OHNE Zitate
- Falls rechtliche Informationen NICHT im Kontext stehen: "Diese Information finde ich nicht in den vorliegenden Dokumenten."
- Antworte präzise und kompakt (max. 3-4 kurze Absätze)
- Strukturiere mit Aufzählungen wenn sinnvoll
- Schreibe auf Deutsch
- KEINE Quellenangaben am Ende auflisten (diese werden automatisch angezeigt)
- Keine Überschriften wie "Antwort:" oder "Zusammenfassung:"

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


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    temperature: float = 0.7
    chunk_size: int = 512


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

# Add CORS Middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_response(text: str) -> str:
    """Remove trailing source sections from LLM response."""
    # Remove common patterns like "Quellen:", "Sources:", "Referenzen:" at the end
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
async def health() -> Dict[str, str]:
    """
    Healthcheck-Endpoint.
    """

    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    """
    Stelle eine Frage an den RAG-Index.

    Antwortet mit generiertem Text und Inline-Zitaten.
    """

    index = index_manager.index
    
    # Create LLM with custom temperature
    from llama_index.llms.openai import OpenAI
    llm = OpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        temperature=req.temperature,
    )
    
    # Use CitationQueryEngine for inline citations [1], [2], etc.
    query_engine = CitationQueryEngine.from_args(
        index,
        similarity_top_k=req.top_k,
        llm=llm,
        citation_chunk_size=req.chunk_size,
        citation_qa_template=CITATION_QA_TEMPLATE,
    )

    try:
        # LlamaIndex ist synchron, daher in Thread ausführen.
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, query_engine.query, req.question)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Antwort und Quellen extrahieren.
    answer_text = clean_response(str(response))
    
    # Extract citation numbers from answer text
    import re
    cited_numbers = set(re.findall(r'\[(\d+)\]', answer_text))
    
    sources: List[Dict[str, Any]] = []
    for idx, node in enumerate(getattr(response, "source_nodes", []) or []):
        citation_num = idx + 1
        
        # Only include sources that were actually cited in the answer
        if str(citation_num) not in cited_numbers:
            continue
            
        metadata = node.metadata or {}
        # Get filename from path
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

