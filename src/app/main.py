from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llama_index.core.query_engine import CitationQueryEngine
from llama_index.core.prompts import PromptTemplate
from llama_index.core.response_synthesizers import get_response_synthesizer

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

# Preload reranker model on startup to avoid cold start delay
_reranker_cache = None
def get_reranker():
    global _reranker_cache
    if _reranker_cache is None and settings.use_reranker:
        _reranker_cache = CrossEncoderReranker(
            model_name=settings.reranker_model,
            top_n=5,
        )
        # Warm up the model with a dummy call
        _reranker_cache._load_model()
    return _reranker_cache

app = FastAPI(
    title="RAG Seminararbeit – LlamaIndex API",
    description="Einfacher Query-Service für eine modulare RAG-Pipeline.",
    version="0.1.0",
)

@app.on_event("startup")
async def startup_event():
    """Preload models on startup to avoid cold start delay."""
    print("Preloading models...")
    get_reranker()  # Load reranker model
    print("Models ready!")

# Add CORS Middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_origins,
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

    # Get cached reranker (preloaded on startup)
    reranker = get_reranker() if settings.use_reranker else None

    # Initialize query transformer if enabled (HyDE generates better retrieval queries)
    query_transformer = None
    if settings.use_query_transform:
        query_transformer = QueryTransformer(
            llm=llm,
            strategy=settings.query_transform_strategy,
            language="german",
        )

    # Use hybrid retrieval if enabled and nodes are available
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
            # Build CitationQueryEngine with custom hybrid retriever
            query_engine = CitationQueryEngine.from_args(
                index,
                retriever=retriever,
                llm=llm,
                citation_chunk_size=req.chunk_size,
                citation_qa_template=CITATION_QA_TEMPLATE,
            )
        else:
            # Fallback to vector-only if no nodes cached yet
            query_engine = CitationQueryEngine.from_args(
                index,
                similarity_top_k=req.top_k,
                llm=llm,
                citation_chunk_size=req.chunk_size,
                citation_qa_template=CITATION_QA_TEMPLATE,
            )
    else:
        # Vector-only retrieval
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

