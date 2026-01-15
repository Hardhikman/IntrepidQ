"""
Vector indexing functionality - Lightweight version using HuggingFace API

This version uses the HuggingFace Inference API instead of local sentence-transformers
to avoid OOM issues on memory-constrained deployments like Render free tier.
"""
import json
import logging
import os
from typing import List, Optional

from langchain_core.documents import Document

from core.embedding_client import get_embedding_client
from core.supabase_client import get_supabase_service

logger = logging.getLogger(__name__)


class VectorIndexer:
    """
    Lightweight vector indexer using HuggingFace API for embeddings.
    Compatible with existing Supabase vector store.
    """
    
    def __init__(self):
        self.embedding_client = get_embedding_client()
        logger.info("VectorIndexer initialized with HuggingFace API embeddings")
    
    def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a query using HuggingFace API."""
        return self.embedding_client.embed_query(text)
    
    def load_documents_from_organized_chunks(self, organized_chunks_path: str) -> List[Document]:
        """Load documents from organized chunks JSON"""
        if not os.path.exists(organized_chunks_path):
            raise FileNotFoundError(f"Organized chunks file not found: {organized_chunks_path}")

        logger.info("Loading from organized chunks...")
        with open(organized_chunks_path, "r", encoding="utf-8") as f:
            organized_data = json.load(f)

        documents = []
        for gs_paper_data in organized_data:
            gs_paper = gs_paper_data["gs_paper"]
            for topic_data in gs_paper_data["topics"]:
                topic = topic_data["topic"]
                questions = topic_data["questions"]

                for question in questions:
                    doc = Document(
                        page_content=question,
                        metadata={
                            "topic": topic,
                            "gs_paper": gs_paper,
                            "source": "UPSC_PYQ"
                        }
                    )
                    documents.append(doc)

        return documents

    def load_documents(self, data_dir: str = "data") -> List[Document]:
        """Load documents from available chunk files"""
        organized_chunks_path = os.path.join(data_dir, "chunks_organized.json")
        flat_chunks_path = os.path.join(data_dir, "chunks.json")

        if os.path.exists(organized_chunks_path):
            return self.load_documents_from_organized_chunks(organized_chunks_path)
        elif os.path.exists(flat_chunks_path):
            return self._load_documents_from_flat_chunks(flat_chunks_path)
        else:
            raise FileNotFoundError("No chunks file found. Please run PDF parsing first.")
    
    def _load_documents_from_flat_chunks(self, flat_chunks_path: str) -> List[Document]:
        """Load documents from flat chunks JSON (fallback)"""
        logger.info("Loading from flat chunks (fallback)...")
        with open(flat_chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)

        documents = []
        for chunk in chunks:
            topic = chunk["topic"]
            questions = chunk["questions"]

            gs_paper = "GS1"
            for gs_num in ["GS1", "GS2", "GS3", "GS4"]:
                if topic.startswith(gs_num):
                    gs_paper = gs_num
                    break

            for question in questions:
                doc = Document(
                    page_content=question,
                    metadata={
                        "topic": topic,
                        "gs_paper": gs_paper,
                        "source": "UPSC_PYQ"
                    }
                )
                documents.append(doc)

        return documents


class LightweightVectorStore:
    """
    Wrapper around Supabase vector store that uses HuggingFace API for embeddings.
    Provides the same interface as the old SupabaseVectorStore but without local model.
    """
    
    def __init__(self, supabase_client, embedding_client):
        self.client = supabase_client
        self.embedding_client = embedding_client
        logger.info("LightweightVectorStore initialized")
    
    def similarity_search(self, query: str, k: int = 5, filter: Optional[dict] = None) -> List[Document]:
        """
        Perform similarity search using Supabase RPC.
        """
        try:
            query_embedding = self.embedding_client.embed_query(query)
            
            response = self.client.rpc("match_documents", {
                "query_embedding": query_embedding,
                "match_count": k,
                "filter": filter or {}
            }).execute()
            
            documents = []
            for item in response.data or []:
                doc = Document(
                    page_content=item.get("content", ""),
                    metadata=item.get("metadata", {})
                )
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            return []


# Global instance
_vectorstore: Optional[LightweightVectorStore] = None


def create_vector_indexer() -> VectorIndexer:
    """Factory function to create vector indexer"""
    return VectorIndexer()


def load_index() -> Optional[LightweightVectorStore]:
    """
    Load the lightweight vector store.
    Returns a LightweightVectorStore that uses HuggingFace API for embeddings.
    """
    global _vectorstore
    
    if _vectorstore is not None:
        return _vectorstore
    
    try:
        supabase_service = get_supabase_service()
        supabase_client = supabase_service._ensure_client()
        embedding_client = get_embedding_client()
        
        _vectorstore = LightweightVectorStore(supabase_client, embedding_client)
        logger.info("LightweightVectorStore loaded successfully")
        return _vectorstore
        
    except Exception as e:
        logger.error(f"Failed to load vector store: {e}")
        return None
