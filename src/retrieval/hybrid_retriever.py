"""
Hybrid Retriever combining BM25 (sparse) and Vector (dense) search.

Uses Reciprocal Rank Fusion (RRF) to combine results from both retrievers,
with optional cross-encoder reranking and query transformation for improved quality.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable, List, Optional

from llama_index.core import VectorStoreIndex
from llama_index.core.schema import NodeWithScore, QueryBundle
from llama_index.core.retrievers import BaseRetriever
from llama_index.retrievers.bm25 import BM25Retriever

if TYPE_CHECKING:
    from src.retrieval.reranker import CrossEncoderReranker
    from src.retrieval.query_transform import QueryTransformer


class HybridRetriever(BaseRetriever):
    """
    Combines BM25 (keyword) and vector (semantic) retrieval using RRF.

    Args:
        vector_index: The VectorStoreIndex for dense retrieval
        nodes: List of nodes to build BM25 index from
        similarity_top_k: Number of results to retrieve from each method
        bm25_weight: Weight for BM25 results (0-1), vector gets (1 - bm25_weight)
        rrf_k: Constant for RRF formula (default 60)
        reranker: Optional cross-encoder reranker for final reranking
        query_transformer: Optional query transformer for HyDE/multi-query
    """

    def __init__(
        self,
        vector_index: VectorStoreIndex,
        nodes: List,
        similarity_top_k: int = 5,
        bm25_weight: float = 0.5,
        rrf_k: int = 60,
        reranker: Optional["CrossEncoderReranker"] = None,
        query_transformer: Optional["QueryTransformer"] = None,
    ) -> None:
        super().__init__()
        self._vector_index = vector_index
        self._similarity_top_k = similarity_top_k
        self._bm25_weight = bm25_weight
        self._rrf_k = rrf_k
        self._reranker = reranker
        self._query_transformer = query_transformer

        # Retrieve more candidates if reranking
        retrieval_multiplier = 4 if reranker else 2

        # Create vector retriever
        self._vector_retriever = vector_index.as_retriever(
            similarity_top_k=similarity_top_k * retrieval_multiplier
        )

        # Create BM25 retriever from nodes
        if nodes:
            self._bm25_retriever = BM25Retriever.from_defaults(
                nodes=nodes,
                similarity_top_k=similarity_top_k * retrieval_multiplier,
            )
        else:
            self._bm25_retriever = None

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """
        Retrieve nodes using hybrid search with RRF fusion and optional reranking.
        """
        original_query = query_bundle.query_str

        # Apply query transformation if configured (e.g., HyDE)
        retrieval_query = original_query
        if self._query_transformer is not None:
            transformed = self._query_transformer.transform(original_query)
            if transformed:
                retrieval_query = transformed[0]

        # Create query bundle for retrieval (may be transformed)
        retrieval_bundle = QueryBundle(query_str=retrieval_query)

        # Get vector results
        vector_nodes = self._vector_retriever.retrieve(retrieval_bundle)

        # Get BM25 results using original query (keywords work better untransformed)
        if self._bm25_retriever is not None:
            bm25_nodes = self._bm25_retriever.retrieve(query_bundle)
        else:
            bm25_nodes = []

        # Fuse results using RRF
        fused_nodes = self._reciprocal_rank_fusion(
            vector_nodes, bm25_nodes
        )

        # Apply reranking if configured (use original query for relevance scoring)
        if self._reranker is not None:
            # Get more candidates for reranking
            candidates = fused_nodes[:self._similarity_top_k * 3]
            reranked_nodes = self._reranker.rerank(
                query=original_query,  # Use original query for reranking
                nodes=candidates,
                top_n=self._similarity_top_k,
            )
            return reranked_nodes

        # Return top-k after fusion
        return fused_nodes[:self._similarity_top_k]

    def _reciprocal_rank_fusion(
        self,
        vector_nodes: List[NodeWithScore],
        bm25_nodes: List[NodeWithScore],
    ) -> List[NodeWithScore]:
        """
        Combine results using Reciprocal Rank Fusion (RRF).

        RRF score = sum(1 / (k + rank)) for each result list
        where k is a constant (default 60) that reduces the impact of high rankings.
        """
        # Build score dictionaries by node ID
        node_scores: dict[str, float] = {}
        node_map: dict[str, NodeWithScore] = {}

        vector_weight = 1 - self._bm25_weight
        bm25_weight = self._bm25_weight

        # Score vector results
        for rank, node in enumerate(vector_nodes):
            node_id = node.node.node_id
            rrf_score = vector_weight * (1 / (self._rrf_k + rank + 1))
            node_scores[node_id] = node_scores.get(node_id, 0) + rrf_score
            node_map[node_id] = node

        # Score BM25 results
        for rank, node in enumerate(bm25_nodes):
            node_id = node.node.node_id
            rrf_score = bm25_weight * (1 / (self._rrf_k + rank + 1))
            node_scores[node_id] = node_scores.get(node_id, 0) + rrf_score
            if node_id not in node_map:
                node_map[node_id] = node

        # Sort by fused score
        sorted_ids = sorted(node_scores.keys(), key=lambda x: node_scores[x], reverse=True)

        # Return sorted nodes with updated scores
        result = []
        for node_id in sorted_ids:
            node = node_map[node_id]
            # Create new NodeWithScore with RRF score
            result.append(
                NodeWithScore(node=node.node, score=node_scores[node_id])
            )

        return result
