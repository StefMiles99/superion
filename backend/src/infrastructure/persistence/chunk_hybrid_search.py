"""Búsqueda híbrida BM25 + cosine sobre chunks — compartida memory/supabase."""

from __future__ import annotations

import re

import numpy as np

from domain.entities.manual_chunk import ManualChunk


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def bm25_score(query_terms: list[str], content: str) -> float:
    if not query_terms:
        return 0.0
    tokens = tokenize(content)
    if not tokens:
        return 0.0
    tf: dict[str, int] = {}
    for token in tokens:
        tf[token] = tf.get(token, 0) + 1
    return float(sum(tf.get(term, 0) for term in query_terms))


def normalize_scores(scores: list[float]) -> list[float]:
    if not scores:
        return []
    minimum = min(scores)
    maximum = max(scores)
    if maximum == minimum:
        return [1.0 if maximum > 0 else 0.0 for _ in scores]
    return [(score - minimum) / (maximum - minimum) for score in scores]


def hybrid_search_chunks(
    chunks: list[ManualChunk],
    *,
    question: str,
    query_embedding: tuple[float, ...],
    top_k: int,
) -> list[tuple[ManualChunk, float]]:
    """Combina cosine + BM25 normalizados 50/50."""
    if not chunks:
        return []

    query_vec = np.array(query_embedding, dtype=np.float64)
    query_terms = tokenize(question)

    vector_scores: list[float] = []
    bm25_scores: list[float] = []
    for chunk in chunks:
        chunk_vec = np.array(chunk.embedding, dtype=np.float64)
        denom = np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
        cosine = float(np.dot(query_vec, chunk_vec) / denom) if denom > 0 else 0.0
        vector_scores.append(max(cosine, 0.0))
        bm25_scores.append(bm25_score(query_terms, chunk.content))

    norm_vector = normalize_scores(vector_scores)
    norm_bm25 = normalize_scores(bm25_scores)

    combined: list[tuple[ManualChunk, float]] = []
    for index, chunk in enumerate(chunks):
        score = 0.5 * norm_vector[index] + 0.5 * norm_bm25[index]
        combined.append((chunk, score))

    combined.sort(key=lambda item: item[1], reverse=True)
    return combined[:top_k]
