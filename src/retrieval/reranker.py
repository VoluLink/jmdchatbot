"""
Cross-Encoder Reranker for improving retrieval quality.

Uses a cross-encoder model to re-score query-document pairs,
providing more accurate relevance scores than bi-encoder embeddings.
"""

from __future__ import annotations

from typing import List, Optional

from llama_index.core.schema import NodeWithScore


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

        if len(nodes) <= top_n:
            return nodes

        model = self._load_model()
        pairs = [(query, node.node.get_content()) for node in nodes]
        scores = model.predict(pairs)

        scored_nodes = list(zip(nodes, scores))
        scored_nodes.sort(key=lambda x: x[1], reverse=True)

        result = []
        for node, score in scored_nodes[:top_n]:
            result.append(
                NodeWithScore(
                    node=node.node,
                    score=float(score),  # Use cross-encoder score
                )
            )

        return result
