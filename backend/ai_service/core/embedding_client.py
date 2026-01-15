"""
HuggingFace Inference API Embedding Client

Replaces local sentence-transformers model with API calls to avoid OOM.
Uses the same all-MiniLM-L6-v2 model for 100% compatibility with existing Supabase embeddings.
"""
import logging
import os
from typing import List, Optional

import requests

logger = logging.getLogger(__name__)

# HuggingFace Inference API endpoint for sentence-transformers
HF_API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"


class HuggingFaceEmbeddingClient:
    """
    Lightweight embedding client using HuggingFace Inference API.
    Generates embeddings compatible with existing Supabase vectors.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
        if not self.api_key:
            logger.warning("No HuggingFace API key found. Set HUGGINGFACE_API_KEY or HF_TOKEN env var.")
        self.headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        logger.info("HuggingFace Embedding Client initialized (API-based, no local model)")
    
    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query text.
        Returns 384-dimensional vector compatible with all-MiniLM-L6-v2.
        """
        try:
            response = requests.post(
                HF_API_URL,
                headers=self.headers,
                json={"inputs": text, "options": {"wait_for_model": True}},
                timeout=30
            )
            response.raise_for_status()
            embedding = response.json()
            
            # HF returns nested list for single input
            if isinstance(embedding, list) and len(embedding) > 0:
                logger.info(f"Successfully generated embedding for query (dim: {len(embedding[0]) if isinstance(embedding[0], list) else len(embedding)})")
                return embedding[0]  # [[384 floats]] -> [384 floats]
            
            logger.info(f"Successfully generated embedding for query (dim: {len(embedding)})")
            return embedding  # Already flat
            
            raise ValueError(f"Unexpected embedding format: {type(embedding)}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HuggingFace API request failed: {e}")
            raise RuntimeError(f"Failed to generate embedding: {e}")
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch).
        """
        try:
            response = requests.post(
                HF_API_URL,
                headers=self.headers,
                json={"inputs": texts, "options": {"wait_for_model": True}},
                timeout=60
            )
            response.raise_for_status()
            embeddings = response.json()
            
            if isinstance(embeddings, list):
                logger.info(f"Successfully generated embeddings for {len(texts)} documents")
                return embeddings
            
            raise ValueError(f"Unexpected embeddings format: {type(embeddings)}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HuggingFace API batch request failed: {e}")
            raise RuntimeError(f"Failed to generate embeddings: {e}")


# Singleton instance
_embedding_client: Optional[HuggingFaceEmbeddingClient] = None


def get_embedding_client() -> HuggingFaceEmbeddingClient:
    """Get or create the singleton embedding client."""
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = HuggingFaceEmbeddingClient()
    return _embedding_client


def embed_query(text: str) -> List[float]:
    """Convenience function to embed a single query."""
    return get_embedding_client().embed_query(text)
