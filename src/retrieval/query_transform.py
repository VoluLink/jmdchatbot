"""
Query Transformation techniques for improved retrieval.

Includes:
- HyDE (Hypothetical Document Embeddings): Generate a hypothetical answer
  and use it for retrieval instead of the raw query
- Multi-Query: Generate multiple query variations to improve recall
"""

from __future__ import annotations

from typing import List, Optional

from llama_index.core.schema import QueryBundle


class QueryTransformer:
    """
    Transforms queries to improve retrieval quality.

    Supports multiple transformation strategies:
    - HyDE: Generate hypothetical document for better semantic matching
    - Multi-Query: Generate query variations for broader recall
    - Combined: Use both strategies together

    Args:
        llm: LlamaIndex LLM instance for generating transformations
        strategy: Transformation strategy ('hyde', 'multi_query', 'combined')
        num_queries: Number of query variations for multi-query (default 3)
        language: Language for generated content (default 'german')
    """

    def __init__(
        self,
        llm,
        strategy: str = "hyde",
        num_queries: int = 3,
        language: str = "german",
    ) -> None:
        self._llm = llm
        self._strategy = strategy
        self._num_queries = num_queries
        self._language = language

    def transform(self, query: str) -> List[str]:
        """
        Transform a query into one or more improved queries.

        Returns a list of transformed queries to use for retrieval.
        """
        if self._strategy == "hyde":
            return [self._generate_hyde(query)]
        elif self._strategy == "multi_query":
            return self._generate_multi_query(query)
        elif self._strategy == "combined":
            hyde_query = self._generate_hyde(query)
            multi_queries = self._generate_multi_query(query)
            return [hyde_query] + multi_queries
        else:
            return [query]

    def _generate_hyde(self, query: str) -> str:
        """
        Generate a Hypothetical Document Embedding (HyDE).

        Instead of searching with the question, we generate what an ideal
        answer might look like and search for similar documents.
        """
        if self._language == "german":
            prompt = f"""Du bist ein Experte für deutsches Aufenthalts- und Asylrecht.
Schreibe einen kurzen Absatz (2-3 Sätze), der die folgende Frage direkt beantwortet.
Antworte so, als wärst du ein Rechtstext oder Informationsblatt.
Füge keine Einleitung oder Erklärung hinzu - schreibe nur den Antworttext.

Frage: {query}

Antwort:"""
        else:
            prompt = f"""You are an expert assistant.
Write a short paragraph (2-3 sentences) that directly answers the following question.
Write as if you are a reference document or factsheet.
Do not add any introduction - just write the answer text.

Question: {query}

Answer:"""

        response = self._llm.complete(prompt)
        return str(response).strip()

    def _generate_multi_query(self, query: str) -> List[str]:
        """
        Generate multiple query variations to improve recall.

        Different phrasings can match different relevant documents.
        """
        if self._language == "german":
            prompt = f"""Du bist ein Suchassistent. Generiere {self._num_queries} verschiedene Varianten
der folgenden Suchanfrage. Jede Variante sollte die gleiche Information suchen,
aber anders formuliert sein (Synonyme, andere Satzstruktur, etc.).

Gib nur die Varianten aus, eine pro Zeile, ohne Nummerierung oder Erklärung.

Ursprüngliche Anfrage: {query}

Varianten:"""
        else:
            prompt = f"""You are a search assistant. Generate {self._num_queries} different variations
of the following search query. Each variation should search for the same information
but be phrased differently (synonyms, different sentence structure, etc.).

Output only the variations, one per line, without numbering or explanation.

Original query: {query}

Variations:"""

        response = self._llm.complete(prompt)
        variations = str(response).strip().split("\n")
        # Clean up and filter empty lines
        variations = [v.strip() for v in variations if v.strip()]
        return variations[:self._num_queries]


class HyDERetriever:
    """
    Wrapper that applies HyDE transformation before retrieval.

    This retriever generates a hypothetical answer first, then uses
    that answer to find similar documents via the base retriever.
    """

    def __init__(
        self,
        base_retriever,
        llm,
        language: str = "german",
    ) -> None:
        self._base_retriever = base_retriever
        self._transformer = QueryTransformer(
            llm=llm,
            strategy="hyde",
            language=language,
        )

    def retrieve(self, query_bundle: QueryBundle):
        """Retrieve using HyDE-transformed query."""
        original_query = query_bundle.query_str
        hyde_queries = self._transformer.transform(original_query)

        if hyde_queries:
            # Use the hypothetical document for retrieval
            hyde_bundle = QueryBundle(query_str=hyde_queries[0])
            return self._base_retriever.retrieve(hyde_bundle)

        return self._base_retriever.retrieve(query_bundle)


class MultiQueryRetriever:
    """
    Retriever that uses multiple query variations and combines results.

    Generates query variations, retrieves for each, and deduplicates
    the combined results.
    """

    def __init__(
        self,
        base_retriever,
        llm,
        num_queries: int = 3,
        language: str = "german",
    ) -> None:
        self._base_retriever = base_retriever
        self._transformer = QueryTransformer(
            llm=llm,
            strategy="multi_query",
            num_queries=num_queries,
            language=language,
        )

    def retrieve(self, query_bundle: QueryBundle):
        """Retrieve using multiple query variations."""
        original_query = query_bundle.query_str
        queries = [original_query] + self._transformer.transform(original_query)

        # Retrieve for each query
        all_nodes = {}
        for query in queries:
            bundle = QueryBundle(query_str=query)
            nodes = self._base_retriever.retrieve(bundle)
            for node in nodes:
                node_id = node.node.node_id
                if node_id not in all_nodes or node.score > all_nodes[node_id].score:
                    all_nodes[node_id] = node

        # Sort by score and return
        sorted_nodes = sorted(all_nodes.values(), key=lambda x: x.score, reverse=True)
        return sorted_nodes
