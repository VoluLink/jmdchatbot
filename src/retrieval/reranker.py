"""
Cross-Encoder Reranker for improving retrieval quality.

Uses a cross-encoder model to re-score query-document pairs,
providing more accurate relevance scores than bi-encoder embeddings.
"""

from __future__ import annotations

from typing import List, Optional

from llama_index.core.schema import NodeWithScore, QueryBundle


class CrossEncoderReranker:
    """
    Reranks retrieved nodes using a cross-encoder model.

    Cross-encoders process query-document pairs together, allowing
    for more accurate relevance scoring than separate embeddings.

    Args:
        model_name: HuggingFace model name for the cross-encoder
        top_n: Number of results to return after reranking
        device: Device to run the model on ('cpu', 'cuda', or None for auto)
    """

    # Popular cross-encoder models for reranking:
    # - "cross-encoder/ms-marco-MiniLM-L-6-v2" (fast, good quality)
    # - "cross-encoder/ms-marco-MiniLM-L-12-v2" (balanced)
    # - "BAAI/bge-reranker-base" (multilingual, good for German)
    # - "BAAI/bge-reranker-large" (best quality, slower)

    DEFAULT_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    def __init__(
        self,
        model_name: Optional[str] = None,
        top_n: int = 5,
        device: Optional[str] = None,
    ) -> None:
        self._model_name = model_name or self.DEFAULT_MODEL
        self._top_n = top_n
        self._device = device
        self._model = None  # Lazy loading

    def _load_model(self):
        """Lazy load the cross-encoder model."""
        if self._model is None:
            from sentence_transformers import CrossEncoder

            self._model = CrossEncoder(
                self._model_name,
                device=self._device,
            )
        return self._model

    def rerank(
        self,
        query: str,
        nodes: List[NodeWithScore],
        top_n: Optional[int] = None,
    ) -> List[NodeWithScore]:
        """
        Rerank nodes based on cross-encoder scores.

        Args:
            query: The search query
            nodes: List of nodes to rerank
            top_n: Override default top_n for this call

        Returns:
            Reranked list of nodes with updated scores
        """
        if not nodes:
            return []

        top_n = top_n or self._top_n

        # Don't rerank if we have fewer nodes than top_n
        if len(nodes) <= top_n:
            return nodes

        # Load model on first use
        model = self._load_model()

        # Prepare query-document pairs for scoring
        pairs = [(query, node.node.get_content()) for node in nodes]

        # Get cross-encoder scores
        scores = model.predict(pairs)

        # Create scored nodes
        scored_nodes = list(zip(nodes, scores))

        # Sort by cross-encoder score (descending)
        scored_nodes.sort(key=lambda x: x[1], reverse=True)

        # Return top_n with updated scores
        result = []
        for node, score in scored_nodes[:top_n]:
            result.append(
                NodeWithScore(
                    node=node.node,
                    score=float(score),  # Use cross-encoder score
                )
            )

        return result


class CohereReranker:
    """
    Alternative reranker using Cohere's Rerank API.

    Requires a Cohere API key. Generally provides better quality
    than local cross-encoders but requires API calls.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "rerank-multilingual-v3.0",
        top_n: int = 5,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._top_n = top_n
        self._client = None

    def _load_client(self):
        """Lazy load Cohere client."""
        if self._client is None:
            import cohere

            self._client = cohere.Client(self._api_key)
        return self._client

    def rerank(
        self,
        query: str,
        nodes: List[NodeWithScore],
        top_n: Optional[int] = None,
    ) -> List[NodeWithScore]:
        """Rerank using Cohere API."""
        if not nodes:
            return []

        top_n = top_n or self._top_n
        client = self._load_client()

        # Prepare documents
        documents = [node.node.get_content() for node in nodes]

        # Call Cohere rerank
        response = client.rerank(
            query=query,
            documents=documents,
            top_n=min(top_n, len(documents)),
            model=self._model,
        )

        # Map results back to nodes
        result = []
        for item in response.results:
            original_node = nodes[item.index]
            result.append(
                NodeWithScore(
                    node=original_node.node,
                    score=item.relevance_score,
                )
            )

        return result
