"""
Embedding service for semantic document retrieval.
Uses Google Gemini embedding model + numpy cosine similarity.
Embeddings are stored as JSON in the documents table (embedding column).
"""

import json
import os
import numpy as np
from google import genai
from google.genai import types as genai_types
from app.models.document import Document
from app import db

EMBEDDING_MODEL = "models/gemini-embedding-001"
MAX_EMBED_CHARS = 8000  # Gemini embedding limit


def _get_client():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def generate_embedding(text: str) -> list | None:
    """Generate an embedding vector for a given text using Gemini."""
    client = _get_client()
    if not client or not text or not text.strip():
        return None
    try:
        snippet = text.strip()[:MAX_EMBED_CHARS]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=snippet,
            config=genai_types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
        )
        return list(result.embeddings[0].values)
    except Exception as e:
        print(f"[embedding_service] Failed to generate embedding: {e}")
        return None


def generate_query_embedding(query: str) -> list | None:
    """Generate an embedding for a search query."""
    client = _get_client()
    if not client or not query or not query.strip():
        return None
    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=query.strip()[:MAX_EMBED_CHARS],
            config=genai_types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
        )
        return list(result.embeddings[0].values)
    except Exception as e:
        print(f"[embedding_service] Failed to generate query embedding: {e}")
        return None


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def embed_document(document: Document) -> bool:
    """
    Generate and store embedding for a document.
    Uses content_summary if available, otherwise content_extracted.
    Returns True if successful.
    """
    content = document.content_summary or document.content_extracted or ''
    if not content.strip():
        return False

    embedding = generate_embedding(content)
    if embedding is None:
        return False

    try:
        document.embedding = json.dumps(embedding)
        db.session.commit()
        return True
    except Exception as e:
        print(f"[embedding_service] Failed to save embedding for doc {document.id}: {e}")
        return False


def get_relevant_docs(query: str, company_id: str, top_k: int = 5) -> list | None:
    """
    Return the top_k most semantically relevant documents for the query.
    Returns None if embeddings are not available (fallback to all docs).
    """
    documents = Document.query.filter_by(company_id=company_id).all()
    if not documents:
        return []

    # Check how many docs have embeddings
    docs_with_embeddings = [d for d in documents if d.embedding]
    coverage = len(docs_with_embeddings) / len(documents)

    # If fewer than 50% of docs have embeddings, return None to trigger fallback
    if coverage < 0.5:
        print(f"[embedding_service] Only {len(docs_with_embeddings)}/{len(documents)} docs have embeddings — using fallback")
        return None

    query_vec = generate_query_embedding(query)
    if query_vec is None:
        return None

    scored = []
    for doc in documents:
        if not doc.embedding:
            continue
        try:
            doc_vec = json.loads(doc.embedding)
            score = cosine_similarity(query_vec, doc_vec)
            scored.append((score, doc))
        except Exception:
            continue

    if not scored:
        return None

    # Sort by descending similarity and return top_k
    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]


def embed_all_company_docs(company_id: str) -> dict:
    """
    Batch-embed all documents for a company that don't yet have embeddings.
    Returns a summary dict with counts.
    """
    documents = Document.query.filter_by(company_id=company_id).all()
    total = len(documents)
    embedded = 0
    skipped = 0
    failed = 0

    for doc in documents:
        if doc.embedding:
            skipped += 1
            continue
        content = doc.content_summary or doc.content_extracted or ''
        if not content.strip():
            skipped += 1
            continue
        success = embed_document(doc)
        if success:
            embedded += 1
        else:
            failed += 1

    return {'total': total, 'embedded': embedded, 'skipped': skipped, 'failed': failed}

